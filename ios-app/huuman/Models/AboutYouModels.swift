import Foundation

struct AboutYouResponse: Codable {
    let yourPlan: YourPlan
    var myNotes: [ContextNote]
    let yourNumbers: YourNumbers
}

struct YourPlan: Codable {
    let coachRationale: String?
    let trackingBriefs: TrackingBriefsData?
    let sessions: [PlanSession]
    let habits: HabitsSummary
    let hasPlan: Bool
}

struct TrackingBriefsData: Codable {
    let nutrition: NutritionBrief?
    let sleep: SleepBrief?
}

struct NutritionBrief: Codable {
    let calorieTarget: Int?
    let proteinTargetG: Int?
    let guidelines: [String]?
}

struct SleepBrief: Codable {
    let targetHours: Double?
    let bedtimeWindow: String?
    let wakeWindow: String?
}

struct PlanSession: Codable, Identifiable {
    let id: String
    let domain: String
    let title: String
    let scheduledDate: String
    let status: String

    var isCompleted: Bool { status == "completed" }
    var isPending: Bool { status == "pending" }

    var dayLabel: String {
        guard let date = Self.dateFormatter.date(from: scheduledDate) else { return scheduledDate }
        return Self.dayFormatter.string(from: date)
    }

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEE"
        return f
    }()
}

struct HabitsSummary: Codable {
    let avgSleepHours: Double?
    let nutritionDaysOnPlan: Int
    let daysTracked: Int
}

struct ContextNote: Codable, Identifiable {
    let id: String
    let content: String
    let category: String
    let date: String
    let source: String
    let scope: String
    let expiresAt: String?
    let deletable: Bool

    var isTemporary: Bool { scope == "temporary" }
    var isFromOnboarding: Bool { source == "onboarding" }

    var formattedDate: String {
        guard let parsed = Self.isoFormatter.date(from: date) else { return date }
        return Self.displayFormatter.string(from: parsed)
    }

    private static let isoFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    private static let displayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f
    }()
}

struct YourNumbers: Codable {
    let weight: WeightData
    let sessions: [SessionCount]
    let nutrition: NutritionSummary
    let progressPhotoCount: Int
    let latestProgressPhotoUrl: String?
}

struct WeightData: Codable {
    let entries: [WeightEntry]
    let current: Double?
    let deltaKg: Double?
    let earliestDate: String?
}

struct WeightEntry: Codable, Identifiable {
    let date: String
    let weightKg: Double

    var id: String { date }
}

struct SessionCount: Codable, Identifiable {
    let domain: String
    let count: Int

    var id: String { domain }
}

struct NutritionSummary: Codable {
    let avgCalories: Int?
    let avgProtein: Int?
    let daysLogged: Int
}
