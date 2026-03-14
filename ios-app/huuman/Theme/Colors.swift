import SwiftUI

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }

    // MARK: - Surfaces
    static let surfaceBase: Color = Color(hex: "000000")
    static let surfaceRaised: Color = Color(hex: "1C1C1E")
    static let surfaceOverlay: Color = Color(hex: "2C2C2E")
    static let surfaceElevated: Color = Color(hex: "3A3A3C")

    // MARK: - Chat
    static let chatBackground: Color = Color(hex: "000000")
    static let chatAccent: Color = Color(hex: "3478F6")
    static let chatPrimaryText: Color = Color(hex: "fafafa")
    static let chatSecondaryText: Color = Color(hex: "a1a1aa")
    static let chatTertiaryText: Color = Color(hex: "71717a")
    static let chatCardSurface: Color = Color.white.opacity(0.06)
    static let chatCardBorder: Color = Color.white.opacity(0.10)
    static let chatHairline: Color = Color.white.opacity(0.06)
    static let userBubble: Color = Color(hex: "2C2C34")

    // MARK: - Borders
    static let borderSubtle: Color = Color(hex: "1F1F23")
    static let borderDefault: Color = Color(hex: "2C2C30")
    static let borderStrong: Color = Color(hex: "3A3A3E")

    // MARK: - Text
    static let textPrimary: Color = Color(hex: "fafafa")
    static let textSecondary: Color = Color(hex: "a1a1aa")
    static let textTertiary: Color = Color(hex: "71717a")
    static let textMuted: Color = Color(hex: "52525b")

    // MARK: - Domain Accents
    static let domainCardio: Color = Color(hex: "f87171")
    static let domainCardioMuted: Color = Color(hex: "3D1F1F")
    static let domainCardioBright: Color = Color(hex: "fca5a5")

    static let domainStrength: Color = Color(hex: "fb923c")
    static let domainStrengthMuted: Color = Color(hex: "3D2A1A")
    static let domainStrengthBright: Color = Color(hex: "fdba74")

    static let domainMindfulness: Color = Color(hex: "22d3ee")
    static let domainMindfulnessMuted: Color = Color(hex: "1A2E33")
    static let domainMindfulnessBright: Color = Color(hex: "67e8f9")

    static let domainNutrition: Color = Color(hex: "4ade80")
    static let domainNutritionMuted: Color = Color(hex: "1A331F")
    static let domainNutritionBright: Color = Color(hex: "86efac")

    static let domainSleep: Color = Color(hex: "a78bfa")
    static let domainSleepMuted: Color = Color(hex: "2A1F3D")
    static let domainSleepBright: Color = Color(hex: "c4b5fd")

    // MARK: - Semantic
    static let semanticSuccess: Color = Color(hex: "34d399")
    static let semanticWarning: Color = Color(hex: "fbbf24")
    static let semanticError: Color = Color(hex: "f87171")
    static let semanticInfo: Color = Color(hex: "60a5fa")

    // MARK: - Domain Color Helper
    static func domainColor(for domain: String) -> Color {
        switch domain.lowercased() {
        case "cardio": return .domainCardio
        case "strength": return .domainStrength
        case "mindfulness": return .domainMindfulness
        case "nutrition": return .domainNutrition
        case "sleep": return .domainSleep
        default: return .textSecondary
        }
    }

    static func domainMutedColor(for domain: String) -> Color {
        switch domain.lowercased() {
        case "cardio": return .domainCardioMuted
        case "strength": return .domainStrengthMuted
        case "mindfulness": return .domainMindfulnessMuted
        case "nutrition": return .domainNutritionMuted
        case "sleep": return .domainSleepMuted
        default: return .surfaceRaised
        }
    }
}
