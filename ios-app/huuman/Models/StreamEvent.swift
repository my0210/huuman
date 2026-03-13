import Foundation

enum StreamEvent {
    case messageStart(id: String)
    case textStart(id: String)
    case textDelta(id: String, text: String)
    case textEnd(id: String)
    case toolInputStart(callId: String, toolName: String)
    case toolInputAvailable(callId: String, toolName: String, input: [String: Any])
    case toolOutputAvailable(callId: String, output: [String: Any])
    case stepStart
    case stepFinish
    case messageFinish
    case done
    case error(String)
}
