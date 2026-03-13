import Foundation
import Supabase

struct ConversationRow: Decodable {
    let id: String
}

struct MessageRow: Decodable {
    let id: String
    let role: String
    let parts: [[String: AnyCodable]]?
    let created_at: String?
}

struct AnyCodable: Decodable {
    let value: Any

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let s = try? container.decode(String.self) { value = s }
        else if let i = try? container.decode(Int.self) { value = i }
        else if let d = try? container.decode(Double.self) { value = d }
        else if let b = try? container.decode(Bool.self) { value = b }
        else if let arr = try? container.decode([AnyCodable].self) { value = arr.map { $0.value } }
        else if let dict = try? container.decode([String: AnyCodable].self) { value = dict.mapValues { $0.value } }
        else { value = NSNull() }
    }
}

@Observable
@MainActor
final class ChatViewModel {
    var messages: [ChatMessage] = []
    var isStreaming = false
    var isThinking = false
    var lastTextUpdate = 0
    var chatId: String?
    var error: String?
    var isLoadingOlder = false
    var hasMoreMessages = true

    private let pageSize = 50
    private var oldestCreatedAt: String?

    func loadChat() async {
        do {
            let session = try await supabase.auth.session
            let userId = session.user.id.uuidString

            let conversations: [ConversationRow] = try await supabase
                .from("conversations")
                .select()
                .eq("user_id", value: userId)
                .order("created_at", ascending: false)
                .limit(1)
                .execute()
                .value

            if let existing = conversations.first {
                chatId = existing.id
            } else {
                let newId = UUID().uuidString
                try await supabase
                    .from("conversations")
                    .insert(["id": newId, "user_id": userId])
                    .execute()
                chatId = newId
            }

            if let cId = chatId {
                let dbMessages: [MessageRow] = try await supabase
                    .from("messages")
                    .select()
                    .eq("conversation_id", value: cId)
                    .order("created_at", ascending: false)
                    .limit(pageSize)
                    .execute()
                    .value

                let reversed = dbMessages.reversed()
                hasMoreMessages = dbMessages.count == pageSize
                oldestCreatedAt = reversed.first?.created_at

                for dbMsg in reversed {
                    if let chatMsg = parseMessageRow(dbMsg) {
                        messages.append(chatMsg)
                    }
                }

                if messages.isEmpty {
                    await loadPlanIntro(userId: userId)
                }
            }
        } catch {
            self.error = "Failed to load chat: \(error.localizedDescription)"
        }
    }

    func loadOlderMessages() async {
        guard !isLoadingOlder, hasMoreMessages, let cId = chatId, let oldest = oldestCreatedAt else { return }
        isLoadingOlder = true

        do {
            let dbMessages: [MessageRow] = try await supabase
                .from("messages")
                .select()
                .eq("conversation_id", value: cId)
                .lt("created_at", value: oldest)
                .order("created_at", ascending: false)
                .limit(pageSize)
                .execute()
                .value

            let reversed = Array(dbMessages.reversed())
            hasMoreMessages = dbMessages.count == pageSize

            if let first = reversed.first {
                oldestCreatedAt = first.created_at
            }

            var olderParsed: [ChatMessage] = []
            for dbMsg in reversed {
                if let chatMsg = parseMessageRow(dbMsg) {
                    olderParsed.append(chatMsg)
                }
            }

            messages.insert(contentsOf: olderParsed, at: 0)
        } catch {
            // Silent
        }

        isLoadingOlder = false
    }

    private func loadPlanIntro(userId: String) async {
        struct PlanRow: Decodable {
            let intro_message: String?
        }

        do {
            let plans: [PlanRow] = try await supabase
                .from("weekly_plans")
                .select("intro_message")
                .eq("user_id", value: userId)
                .order("created_at", ascending: false)
                .limit(1)
                .execute()
                .value

            if let intro = plans.first?.intro_message, !intro.isEmpty {
                messages.append(ChatMessage(
                    role: .assistant,
                    parts: [.text(id: UUID().uuidString, content: intro)]
                ))
            }
        } catch {
            // Silent
        }
    }

    private func parseMessageRow(_ dbMsg: MessageRow) -> ChatMessage? {
        let parts = dbMsg.parts ?? []
        let messageParts: [MessagePart] = parts.compactMap { part in
            let dict = part.mapValues { $0.value }
            let type = dict["type"] as? String ?? ""
            if type == "text", let text = dict["text"] as? String, !text.isEmpty {
                return .text(id: UUID().uuidString, content: text)
            }
            if (type.hasPrefix("tool-") || type == "tool-invocation"),
               let state = dict["state"] as? String,
               state == "output-available",
               let toolName = dict["toolName"] as? String,
               let output = dict["output"] as? [String: Any] {
                return .toolResult(id: UUID().uuidString, toolName: toolName, output: output)
            }
            return nil
        }

        guard !messageParts.isEmpty else { return nil }
        return ChatMessage(
            id: dbMsg.id,
            role: dbMsg.role == "user" ? .user : .assistant,
            parts: messageParts
        )
    }

    func send(text: String, images: [Data]? = nil) {
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty || images != nil, !isStreaming else { return }

        let userMessage = ChatMessage(
            role: .user,
            parts: [.text(id: UUID().uuidString, content: text)]
        )
        messages.append(userMessage)

        isStreaming = true
        isThinking = true
        error = nil

        Task {
            do {
                var fileParts: [[String: Any]]?
                if let images {
                    fileParts = []
                    for imageData in images {
                        let base64 = imageData.base64EncodedString()
                        fileParts?.append([
                            "type": "file",
                            "mediaType": "image/jpeg",
                            "data": base64,
                        ])
                    }
                }

                var currentMessageId: String?
                var accumulatedText = ""
                var currentToolName: String?

                let stream = await ChatService.shared.sendMessage(
                    chatId: chatId ?? "",
                    text: text,
                    files: fileParts
                )

                for try await event in stream {
                    switch event {
                    case .messageStart(let id):
                        currentMessageId = id
                        let msg = ChatMessage(id: id, role: .assistant, parts: [])
                        messages.append(msg)
                        isThinking = false

                    case .textStart(let id):
                        accumulatedText = ""
                        appendPart(.text(id: id, content: ""), to: currentMessageId)

                    case .textDelta(let id, let delta):
                        accumulatedText += delta
                        updateTextPart(id: id, text: accumulatedText, in: currentMessageId)
                        lastTextUpdate += 1
                        isThinking = false

                    case .textEnd:
                        break

                    case .toolInputStart(let callId, let toolName):
                        currentToolName = toolName
                        appendPart(.toolLoading(id: callId, toolName: toolName), to: currentMessageId)
                        isThinking = false

                    case .toolInputAvailable:
                        break

                    case .toolOutputAvailable(let callId, let output):
                        if let toolName = currentToolName {
                            replacePart(id: callId, with: .toolResult(id: callId, toolName: toolName, output: output), in: currentMessageId)
                        }
                        currentToolName = nil

                    case .stepStart:
                        isThinking = true

                    case .stepFinish:
                        isThinking = false

                    case .messageFinish, .done:
                        break

                    case .error(let msg):
                        self.error = msg
                    }
                }
            } catch {
                self.error = error.localizedDescription
            }

            isStreaming = false
            isThinking = false
        }
    }

    private func appendPart(_ part: MessagePart, to messageId: String?) {
        guard let messageId,
              let idx = messages.firstIndex(where: { $0.id == messageId }) else { return }
        var updated = messages
        updated[idx].parts.append(part)
        messages = updated
    }

    private func updateTextPart(id: String, text: String, in messageId: String?) {
        guard let messageId,
              let msgIdx = messages.firstIndex(where: { $0.id == messageId }),
              let partIdx = messages[msgIdx].parts.firstIndex(where: { $0.id == id }) else { return }
        var updated = messages
        updated[msgIdx].parts[partIdx] = .text(id: id, content: text)
        messages = updated
    }

    private func replacePart(id: String, with newPart: MessagePart, in messageId: String?) {
        guard let messageId,
              let msgIdx = messages.firstIndex(where: { $0.id == messageId }),
              let partIdx = messages[msgIdx].parts.firstIndex(where: { $0.id == id }) else { return }
        var updated = messages
        updated[msgIdx].parts[partIdx] = newPart
        messages = updated
    }
}
