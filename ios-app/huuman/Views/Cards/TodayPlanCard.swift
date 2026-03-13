import SwiftUI

struct TodayPlanCard: View {
    let data: [String: Any]

    var body: some View {
        let sessions = (data["sessions"] as? [[String: Any]] ?? [])
            .filter { ["cardio", "strength", "mindfulness"].contains($0["domain"] as? String ?? "") }
        let hasPlan = data["hasPlan"] as? Bool ?? false
        let dateStr = data["date"] as? String ?? ""
        let trackingBriefs = data["trackingBriefs"] as? [String: Any]
        let habits = data["habits"] as? [String: Any]

        if !hasPlan || (sessions.isEmpty && trackingBriefs == nil) {
            VStack(alignment: .leading, spacing: 4) {
                Text("No plan for today")
                    .font(.system(size: 15, weight: .medium))
                    .fontWeight(.medium)
                    .foregroundStyle(Color.chatPrimaryText)
                Text("Ask me to generate your weekly plan to get started.")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.chatSecondaryText)
            }
            .padding(AppLayout.cardPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .chatAttachmentCard()
        } else {
            VStack(spacing: 0) {
                HStack {
                    Text(formatDayName(dateStr))
                        .font(.system(size: 15, weight: .semibold))
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.chatPrimaryText)
                    Spacer()
                    let completed = sessions.filter { ($0["status"] as? String) == "completed" }.count
                    if !sessions.isEmpty {
                        Text(completed == sessions.count ? "All done" : "\(completed) of \(sessions.count) sessions")
                            .font(.system(size: 14, weight: .medium))
                            .fontWeight(.medium)
                            .foregroundStyle(completed == sessions.count ? Color.semanticSuccess : Color.chatSecondaryText)
                    }
                }
                .padding(.horizontal, AppLayout.cardPadding)
                .padding(.vertical, 10)

                Divider().overlay(Color.chatHairline)

                ForEach(Array(sessions.enumerated()), id: \.offset) { i, session in
                    TodaySessionRow(session: session)
                    if i < sessions.count - 1 {
                        Divider().overlay(Color.chatHairline).padding(.leading, 54)
                    }
                }

                if let briefs = trackingBriefs {
                    Divider().overlay(Color.chatHairline)

                    if let nutrition = briefs["nutrition"] as? [String: Any] {
                        NutritionBriefRow(brief: nutrition, habits: habits)
                    }
                    Divider().overlay(Color.chatHairline).padding(.leading, 54)
                    if let sleep = briefs["sleep"] as? [String: Any] {
                        SleepBriefRow(brief: sleep, habits: habits)
                    }
                }
            }
            .chatAttachmentCard()
        }
    }

    private func formatDayName(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        guard let date = formatter.date(from: iso) else { return iso }
        let df = DateFormatter()
        df.dateFormat = "EEEE, MMM d"
        return df.string(from: date)
    }
}

private struct TodaySessionRow: View {
    let session: [String: Any]

    var body: some View {
        let domain = session["domain"] as? String ?? ""
        let title = session["title"] as? String ?? ""
        let status = session["status"] as? String ?? "planned"
        let isCompleted = status == "completed"

        HStack(spacing: 12) {
            DomainIcon(domain: domain, isCompleted: isCompleted)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(isCompleted ? Color.chatSecondaryText : Color.chatPrimaryText)
                    .strikethrough(isCompleted)
                Text(domain.capitalized)
                    .font(.caption2)
                    .foregroundStyle(Color.domainColor(for: domain))
            }

            Spacer()

            if isCompleted {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(Color.semanticSuccess)
                    .font(.subheadline)
            }
        }
        .padding(.horizontal, AppLayout.cardPadding)
        .padding(.vertical, 10)
    }
}

private struct DomainIcon: View {
    let domain: String
    let isCompleted: Bool

    private var systemName: String {
        switch domain {
        case "cardio": return "heart.fill"
        case "strength": return "dumbbell.fill"
        case "mindfulness": return "brain.head.profile"
        case "nutrition": return "flame.fill"
        case "sleep": return "moon.fill"
        default: return "circle.fill"
        }
    }

    var body: some View {
        Image(systemName: isCompleted ? "checkmark" : systemName)
            .font(.caption2)
            .foregroundStyle(Color.domainColor(for: domain))
            .frame(width: AppLayout.domainIconSize, height: AppLayout.domainIconSize)
            .background(Color.domainMutedColor(for: domain), in: RoundedRectangle(cornerRadius: 8))
    }
}

private struct NutritionBriefRow: View {
    let brief: [String: Any]
    let habits: [String: Any]?

    var body: some View {
        let cal = brief["calorieTarget"] as? Int ?? 0
        let protein = brief["proteinTargetG"] as? Int ?? 0
        let logged = habits?["nutrition_on_plan"] != nil
        let onPlan = habits?["nutrition_on_plan"] as? Bool

        HStack(spacing: 12) {
            DomainIcon(domain: "nutrition", isCompleted: logged && onPlan == true)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(cal) kcal · \(protein)g protein")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(Color.chatPrimaryText)
                    .monospacedDigit()
                Text("Nutrition")
                    .font(.caption2)
                    .foregroundStyle(Color.chatSecondaryText)
            }

            Spacer()

            if !logged {
                Text("Log")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(Color.chatTertiaryText)
                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundStyle(Color.chatTertiaryText)
            } else if onPlan == true {
                HStack(spacing: 4) {
                    Image(systemName: "checkmark")
                        .font(.caption2)
                    Text("On plan")
                        .font(.caption)
                        .fontWeight(.medium)
                }
                .foregroundStyle(Color.domainNutrition)
            }
        }
        .padding(.horizontal, AppLayout.cardPadding)
        .padding(.vertical, 10)
    }
}

private struct SleepBriefRow: View {
    let brief: [String: Any]
    let habits: [String: Any]?

    var body: some View {
        let target: Double = {
            if let d = brief["targetHours"] as? Double { return d }
            if let i = brief["targetHours"] as? Int { return Double(i) }
            return 8
        }()
        let bedtime = brief["bedtimeWindow"] as? String ?? ""
        let logged = habits?["sleep_hours"] != nil
        let hours = habits?["sleep_hours"] as? Double

        HStack(spacing: 12) {
            DomainIcon(domain: "sleep", isCompleted: logged && (hours ?? 0) >= target)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(String(format: "%.0f", target))h target · Bed \(bedtime)")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(Color.chatPrimaryText)
                Text("Sleep")
                    .font(.caption2)
                    .foregroundStyle(Color.chatSecondaryText)
            }

            Spacer()

            if !logged {
                Text("Log")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(Color.chatTertiaryText)
                Image(systemName: "chevron.right")
                    .font(.caption2)
                    .foregroundStyle(Color.chatTertiaryText)
            } else if let h = hours {
                Text("\(String(format: "%.1f", h))h / \(String(format: "%.0f", target))h")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(h >= target ? Color.domainSleep : Color.chatSecondaryText)
                    .monospacedDigit()
            }
        }
        .padding(.horizontal, AppLayout.cardPadding)
        .padding(.vertical, 10)
    }
}
