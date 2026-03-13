import Foundation

enum MessageRole: String, Codable {
    case user
    case assistant
}

enum MessagePart: Identifiable {
    case text(id: String, content: String)
    case image(id: String, url: String, filename: String?)
    case toolLoading(id: String, toolName: String)
    case toolResult(id: String, toolName: String, output: [String: Any])
    case toolError(id: String)

    var id: String {
        switch self {
        case .text(let id, _): return id
        case .image(let id, _, _): return id
        case .toolLoading(let id, _): return id
        case .toolResult(let id, _, _): return id
        case .toolError(let id): return id
        }
    }
}

struct ChatMessage: Identifiable {
    let id: String
    let role: MessageRole
    var parts: [MessagePart]
    let createdAt: Date

    init(id: String = UUID().uuidString, role: MessageRole, parts: [MessagePart], createdAt: Date = Date()) {
        self.id = id
        self.role = role
        self.parts = parts
        self.createdAt = createdAt
    }
}
