import Foundation
import SwiftUI
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
    var chatId: String?
    var error: String?
    var isLoadingOlder = false
    var hasMoreMessages = true
    var userName: String = "?"
    var scrollTrigger = 0
    var userScrolledAway = false

    private let pageSize = 50
    private var oldestCreatedAt: String?

    func loadChat() async {
        do {
            messages = []
            hasMoreMessages = true
            oldestCreatedAt = nil

            let session = try await supabase.auth.session
            let userId = session.user.id.uuidString

            await loadUserName(userId: userId)

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

    private func loadUserName(userId: String) async {
        struct NameRow: Decodable { let display_name: String? }
        do {
            let profiles: [NameRow] = try await supabase
                .from("user_profiles")
                .select("display_name")
                .eq("id", value: userId)
                .limit(1)
                .execute()
                .value
            if let name = profiles.first?.display_name, !name.isEmpty {
                userName = name
            }
        } catch {}
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
        } catch {}

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
        } catch {}
    }

    private func parseMessageRow(_ dbMsg: MessageRow) -> ChatMessage? {
        let parts = dbMsg.parts ?? []
        let messageParts: [MessagePart] = parts.compactMap { part in
            let dict = part.mapValues { $0.value }
            let type = dict["type"] as? String ?? ""
            if type == "text", let text = dict["text"] as? String, !text.isEmpty {
                return .text(id: UUID().uuidString, content: text)
            }
            if type == "file",
               let url = dict["url"] as? String, !url.isEmpty,
               let mediaType = dict["mediaType"] as? String, mediaType.hasPrefix("image/") {
                return .image(id: UUID().uuidString, url: url, filename: dict["filename"] as? String)
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
            parts: messageParts,
            createdAt: parseCreatedAt(dbMsg.created_at)
        )
    }

    var isUploading = false

    func send(text: String, images: [Data]? = nil) {
        let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let attachedImages = (images?.isEmpty == false) ? images : nil

        guard !trimmedText.isEmpty || attachedImages != nil, !isStreaming, !isUploading else { return }

        var userParts: [MessagePart] = []

        if !trimmedText.isEmpty {
            userParts.append(.text(id: UUID().uuidString, content: trimmedText))
        }

        if let attachedImages {
            for imageData in attachedImages {
                if let uiImage = UIImage(data: imageData) {
                    userParts.append(.localImage(id: UUID().uuidString, image: uiImage))
                }
            }
        }

        let userMessage = ChatMessage(
            role: .user,
            parts: userParts
        )
        userScrolledAway = false
        withAnimation(.easeOut(duration: 0.25)) {
            messages.append(userMessage)
        }
        scrollTrigger += 1
        if attachedImages != nil {
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(150))
                scrollTrigger += 1
            }
        }

        isStreaming = true
        isThinking = true
        isUploading = attachedImages != nil
        error = nil

        Task {
            var currentMessageId: String?

            do {
                var fileParts: [[String: Any]]?

                if let attachedImages {
                    let session = try await supabase.auth.session
                    let userId = session.user.id.uuidString.lowercased()

                    let storage = supabase.storage.from("chat-images")
                    fileParts = try await withThrowingTaskGroup(of: [String: Any].self) { group in
                        for imageData in attachedImages {
                            group.addTask {
                                let path = "\(userId)/\(Int(Date().timeIntervalSince1970 * 1000))-\(UUID().uuidString.prefix(8).lowercased()).jpg"
                                try await storage.upload(path, data: imageData, options: .init(contentType: "image/jpeg"))
                                let publicURL = try storage.getPublicURL(path: path)
                                return [
                                    "type": "file",
                                    "mediaType": "image/jpeg",
                                    "url": publicURL.absoluteString,
                                ] as [String: Any]
                            }
                        }
                        var results: [[String: Any]] = []
                        for try await result in group {
                            results.append(result)
                        }
                        return results
                    }
                    isUploading = false
                }

                var accumulatedText = ""
                var toolNamesByCallId: [String: String] = [:]

                let stream = await ChatService.shared.sendMessage(
                    chatId: chatId ?? "",
                    text: trimmedText,
                    files: fileParts
                )

                for try await event in stream {
                    switch event {
                    case .messageStart(let id):
                        currentMessageId = id
                        withAnimation(.easeOut(duration: 0.25)) {
                            messages.append(ChatMessage(id: id, role: .assistant, parts: []))
                        }

                    case .textStart(let id):
                        accumulatedText = ""
                        appendPart(.text(id: id, content: ""), to: currentMessageId)

                    case .textDelta(let id, let delta):
                        accumulatedText += delta
                        updateTextPart(id: id, text: accumulatedText, in: currentMessageId)
                        scrollTrigger += 1
                        isThinking = false

                    case .textEnd:
                        break

                    case .toolInputStart(let callId, let toolName):
                        toolNamesByCallId[callId] = toolName
                        appendPart(.toolLoading(id: callId, toolName: toolName), to: currentMessageId)
                        isThinking = false

                    case .toolInputAvailable(let callId, let toolName, _):
                        toolNamesByCallId[callId] = toolName

                    case .toolOutputAvailable(let callId, let output):
                        if let toolName = toolNamesByCallId.removeValue(forKey: callId) {
                            replacePart(id: callId, with: .toolResult(id: callId, toolName: toolName, output: output), in: currentMessageId)
                        }
                        scrollTrigger += 1

                    case .stepStart:
                        isThinking = true

                    case .stepFinish:
                        isThinking = false

                    case .messageFinish, .done:
                        removeMessageIfContentless(id: currentMessageId)
                        break

                    case .error(let msg):
                        self.error = msg
                        removeMessageIfContentless(id: currentMessageId)
                    }
                }
            } catch {
                if isUploading {
                    isUploading = false
                    if let lastIdx = messages.indices.last,
                       messages[lastIdx].role == .user {
                        messages.remove(at: lastIdx)
                    }
                    self.error = "Failed to upload image. Please try again."
                } else {
                    self.error = error.localizedDescription
                    removeMessageIfContentless(id: currentMessageId)
                }
            }

            isStreaming = false
            isThinking = false
        }
    }

    private func appendPart(_ part: MessagePart, to messageId: String?) {
        guard let messageId,
              let idx = messages.firstIndex(where: { $0.id == messageId }) else { return }
        messages[idx].parts.append(part)
    }

    private func updateTextPart(id: String, text: String, in messageId: String?) {
        guard let messageId,
              let msgIdx = messages.firstIndex(where: { $0.id == messageId }),
              let partIdx = messages[msgIdx].parts.firstIndex(where: { $0.id == id }) else { return }
        messages[msgIdx].parts[partIdx] = .text(id: id, content: text)
    }

    private func replacePart(id: String, with newPart: MessagePart, in messageId: String?) {
        guard let messageId,
              let msgIdx = messages.firstIndex(where: { $0.id == messageId }),
              let partIdx = messages[msgIdx].parts.firstIndex(where: { $0.id == id }) else { return }
        messages[msgIdx].parts[partIdx] = newPart
    }

    private func removeMessageIfContentless(id messageId: String?) {
        guard let messageId,
              let msgIdx = messages.firstIndex(where: { $0.id == messageId }) else { return }

        let hasVisibleContent = messages[msgIdx].parts.contains { part in
            switch part {
            case .text(_, let content):
                return !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            case .image, .localImage, .toolResult, .toolError:
                return true
            case .toolLoading:
                return false
            }
        }

        if !hasVisibleContent {
            messages.remove(at: msgIdx)
        }
    }

    private func parseCreatedAt(_ rawValue: String?) -> Date {
        guard let rawValue else { return Date() }

        let internetFormatter = ISO8601DateFormatter()
        internetFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = internetFormatter.date(from: rawValue) {
            return date
        }

        let fallbackFormatter = ISO8601DateFormatter()
        fallbackFormatter.formatOptions = [.withInternetDateTime]
        if let date = fallbackFormatter.date(from: rawValue) {
            return date
        }

        let postgresFormatter = DateFormatter()
        postgresFormatter.locale = Locale(identifier: "en_US_POSIX")
        postgresFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXXXX"
        if let date = postgresFormatter.date(from: rawValue) {
            return date
        }

        return Date()
    }
}