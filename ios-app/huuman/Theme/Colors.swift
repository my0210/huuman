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
    static let surfaceBase = Color(hex: "111114")
    static let surfaceRaised = Color(hex: "1C1C1E")
    static let surfaceOverlay = Color(hex: "2C2C2E")
    static let surfaceElevated = Color(hex: "3A3A3C")

    // MARK: - Borders
    static let borderSubtle = Color(hex: "1F1F23")
    static let borderDefault = Color(hex: "2C2C30")
    static let borderStrong = Color(hex: "3A3A3E")

    // MARK: - Text
    static let textPrimary = Color(hex: "fafafa")
    static let textSecondary = Color(hex: "a1a1aa")
    static let textTertiary = Color(hex: "71717a")
    static let textMuted = Color(hex: "52525b")

    // MARK: - Domain Accents
    static let domainCardio = Color(hex: "f87171")
    static let domainCardioMuted = Color(hex: "3D1F1F")
    static let domainCardioBright = Color(hex: "fca5a5")

    static let domainStrength = Color(hex: "fb923c")
    static let domainStrengthMuted = Color(hex: "3D2A1A")
    static let domainStrengthBright = Color(hex: "fdba74")

    static let domainMindfulness = Color(hex: "22d3ee")
    static let domainMindfulnessMuted = Color(hex: "1A2E33")
    static let domainMindfulnessBright = Color(hex: "67e8f9")

    static let domainNutrition = Color(hex: "4ade80")
    static let domainNutritionMuted = Color(hex: "1A331F")
    static let domainNutritionBright = Color(hex: "86efac")

    static let domainSleep = Color(hex: "a78bfa")
    static let domainSleepMuted = Color(hex: "2A1F3D")
    static let domainSleepBright = Color(hex: "c4b5fd")

    // MARK: - Semantic
    static let semanticSuccess = Color(hex: "34d399")
    static let semanticWarning = Color(hex: "fbbf24")
    static let semanticError = Color(hex: "f87171")
    static let semanticInfo = Color(hex: "60a5fa")

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
