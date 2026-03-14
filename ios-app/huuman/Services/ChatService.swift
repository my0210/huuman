import Foundation
import Supabase

actor ChatService {
    static let shared = ChatService()
    private let baseURL = "https://app.huuman.life"

    func sendMessage(chatId: String, text: String, files: [[String: Any]]? = nil) -> AsyncThrowingStream<StreamEvent, Error> {
        AsyncThrowingStream { continuation in
            Task {
                do {
                    let session = try await supabase.auth.session

                    let messageId = UUID().uuidString

                    var messageParts: [[String: Any]] = []
                    if !text.isEmpty {
                        messageParts.append(["type": "text", "text": text])
                    }
                    if let files {
                        messageParts.append(contentsOf: files)
                    }

                    let body: [String: Any] = [
                        "id": chatId,
                        "message": [
                            "id": messageId,
                            "role": "user",
                            "parts": messageParts,
                        ] as [String: Any],
                    ]

                    let url = URL(string: "\(baseURL)/api/chat")!
                    var request = URLRequest(url: url)
                    request.httpMethod = "POST"
                    request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
                    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                    request.httpBody = try JSONSerialization.data(withJSONObject: body)

                    let (bytes, response) = try await URLSession.shared.bytes(for: request)

                    let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0

                    guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                        if let _ = response as? HTTPURLResponse {
                            for try await _ in bytes.lines { }
                        }
                        continuation.finish(throwing: APIError.serverError(statusCode))
                        return
                    }

                    for try await line in bytes.lines {
                        if !line.hasPrefix("data: ") { continue }
                        let payload = String(line.dropFirst(6))

                        if payload == "[DONE]" {
                            continuation.yield(.done)
                            break
                        }

                        guard let data = payload.data(using: .utf8),
                              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                              let type = json["type"] as? String else { continue }

                        let event = parseEvent(type: type, json: json)
                        if let event { continuation.yield(event) }
                    }

                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
        }
    }

    private func parseEvent(type: String, json: [String: Any]) -> StreamEvent? {
        switch type {
        case "start":
            return .messageStart(id: json["messageId"] as? String ?? UUID().uuidString)

        case "text-start":
            return .textStart(id: json["id"] as? String ?? UUID().uuidString)

        case "text-delta":
            guard let delta = json["delta"] as? String else { return nil }
            return .textDelta(id: json["id"] as? String ?? "", text: delta)

        case "text-end":
            return .textEnd(id: json["id"] as? String ?? "")

        case "tool-input-start":
            return .toolInputStart(
                callId: json["toolCallId"] as? String ?? "",
                toolName: json["toolName"] as? String ?? ""
            )

        case "tool-input-available":
            return .toolInputAvailable(
                callId: json["toolCallId"] as? String ?? "",
                toolName: json["toolName"] as? String ?? "",
                input: json["input"] as? [String: Any] ?? [:]
            )

        case "tool-output-available":
            return .toolOutputAvailable(
                callId: json["toolCallId"] as? String ?? "",
                output: json["output"] as? [String: Any] ?? [:]
            )

        case "start-step":
            return .stepStart

        case "finish-step":
            return .stepFinish

        case "finish":
            return .messageFinish

        case "error":
            return .error(json["errorText"] as? String ?? "Unknown error")

        default:
            return nil
        }
    }
}
