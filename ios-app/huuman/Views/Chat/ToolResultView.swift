import SwiftUI

struct ToolResultView: View {
    let toolName: String
    let output: [String: Any]
    @Environment(\.openURL) private var openURL

    var body: some View {
        Group {
            switch toolName {
            case "show_today_plan":
                TodayPlanCard(data: output)
            case "show_week_plan":
                if output["isDraft"] as? Bool == true {
                    DraftPlanCard(data: output)
                } else {
                    WeekPlanCard(data: output)
                }
            case "generate_plan":
                if output["isDraft"] as? Bool == true {
                    DraftPlanCard(data: output)
                } else {
                    StatusCard(text: output["error"] != nil ? "Plan couldn't be generated right now." : "Your plan is ready.", isSuccess: output["error"] == nil)
                }
            case "start_timer":
                StatusCard(text: "Timer: \(output["minutes"] as? Int ?? 0) min — \(output["label"] as? String ?? "Session")", isSuccess: true)
            case "confirm_plan":
                StatusCard(text: output["error"] != nil ? "Couldn't lock in the plan." : "Plan locked in. Let's go.", isSuccess: output["error"] == nil)
            case "complete_session", "log_session":
                CoachSessionCard(data: output)
            case "show_progress":
                ProgressRingsCard(data: output)
            case "log_daily":
                let logged = output["logged"] as? [String: Any]
                if logged?["sleep_hours"] != nil && logged?["steps_actual"] == nil && logged?["nutrition_on_plan"] == nil {
                    CoachSleepCard(data: output)
                } else {
                    DailyLogCard(data: output)
                }
            case "adapt_plan":
                AdaptCard(data: output)
            case "search_youtube":
                YouTubeCard(data: output, openURL: openURL)
            case "log_weight":
                WeightCard(data: output)
            case "show_session":
                SessionDetailCardView(data: output)
            case "save_progress_photo":
                SavedPhotoCardView(data: output)
            case "save_meal_photo":
                SavedMealCardView(data: output)
            case "delete_session":
                StatusCard(text: "Session removed.", isSuccess: true)
            case "save_context":
                StatusCard(text: "Got it, saved.", isSuccess: true)
            case "save_feedback":
                StatusCard(text: "Thanks for the feedback.", isSuccess: true)
            case "validate_plan":
                EmptyView()
            default:
                EmptyView()
            }
        }
    }
}

// MARK: - Simple Cards

struct StatusCard: View {
    let text: String
    let isSuccess: Bool

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: isSuccess ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                .font(.subheadline)
                .foregroundStyle(isSuccess ? Color.semanticSuccess : Color.textTertiary)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(isSuccess ? Color.semanticSuccess : Color.textTertiary)
        }
        .padding(AppLayout.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            isSuccess ? Color.semanticSuccess.opacity(0.08) : Color.surfaceRaised,
            in: RoundedRectangle(cornerRadius: AppLayout.cardRadius)
        )
    }
}

struct AdaptCard: View {
    let data: [String: Any]

    var body: some View {
        let action = data["action"] as? String ?? ""
        let reason = data["reason"] as? String ?? ""
        let session = data["session"] as? [String: Any]
        let title = session?["title"] as? String

        let labels = ["skipped": "Skipped", "rescheduled": "Rescheduled", "modified": "Updated"]

        VStack(alignment: .leading, spacing: 4) {
            Text("\(labels[action] ?? action)\(title != nil ? ": \(title!)" : "")")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(Color.textSecondary)
            Text(reason)
                .font(.caption)
                .foregroundStyle(Color.textMuted)
        }
        .padding(AppLayout.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
    }
}

struct YouTubeCard: View {
    let data: [String: Any]
    let openURL: OpenURLAction

    var body: some View {
        let videos = data["videos"] as? [[String: Any]] ?? []

        VStack(spacing: 8) {
            ForEach(Array(videos.prefix(3).enumerated()), id: \.offset) { _, video in
                let title = video["title"] as? String ?? ""
                let channel = video["channel"] as? String ?? ""

                Button {
                    if let urlStr = video["url"] as? String, let url = URL(string: urlStr) {
                        openURL(url)
                    }
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "play.rectangle.fill")
                            .foregroundStyle(Color.semanticError)
                            .font(.title2)
                            .frame(width: 48)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(title)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundStyle(Color.textPrimary)
                                .lineLimit(2)
                            Text(channel)
                                .font(.caption2)
                                .foregroundStyle(Color.textMuted)
                        }
                        Spacer()
                        Image(systemName: "arrow.up.right")
                            .font(.caption)
                            .foregroundStyle(Color.textMuted)
                    }
                    .padding(AppLayout.cardPadding)
                    .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
                }
                .buttonStyle(.plain)
            }
        }
    }
}

struct WeightCard: View {
    let data: [String: Any]

    var body: some View {
        let weight = data["weightKg"] as? Double ?? 0
        let date = data["date"] as? String ?? ""

        HStack {
            Image(systemName: "scalemass")
                .foregroundStyle(Color.textMuted)
                .font(.subheadline)
            Text("\(String(format: "%.1f", weight)) kg")
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(Color.textPrimary)
                .monospacedDigit()
            Spacer()
            Text(date)
                .font(.caption)
                .foregroundStyle(Color.textMuted)
        }
        .padding(AppLayout.cardPadding)
        .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
    }
}

struct DailyLogCard: View {
    let data: [String: Any]

    var body: some View {
        let logged = data["logged"] as? [String: Any] ?? [:]
        let steps = logged["steps_actual"] as? Int
        let sleep = logged["sleep_hours"] as? Double
        let nutrition = logged["nutrition_on_plan"] as? Bool

        VStack(alignment: .leading, spacing: 6) {
            if let sleep {
                HStack(spacing: 6) {
                    Image(systemName: "moon.fill")
                        .foregroundStyle(Color.domainSleep)
                        .font(.caption)
                    Text("\(String(format: "%.1f", sleep))h sleep")
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                }
            }
            if let steps {
                HStack(spacing: 6) {
                    Image(systemName: "figure.walk")
                        .foregroundStyle(Color.domainCardio)
                        .font(.caption)
                    Text("\(steps) steps")
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                }
            }
            if let nutrition {
                HStack(spacing: 6) {
                    Image(systemName: "leaf.fill")
                        .foregroundStyle(Color.domainNutrition)
                        .font(.caption)
                    Text(nutrition ? "On plan" : "Off plan")
                        .font(.subheadline)
                        .foregroundStyle(Color.textSecondary)
                }
            }
        }
        .padding(AppLayout.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
    }
}
