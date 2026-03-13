import SwiftUI

struct SessionDetailCardView: View {
    let data: [String: Any]

    var body: some View {
        let domain = data["domain"] as? String ?? ""
        let title = data["title"] as? String ?? "Session"
        let detail = data["detail"] as? [String: Any] ?? [:]

        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Circle()
                    .fill(Color.domainColor(for: domain))
                    .frame(width: 8, height: 8)
                Text(title)
                    .font(.system(size: 15, weight: .semibold))
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.chatPrimaryText)
            }

            if domain == "strength" {
                StrengthDetail(detail: detail)
            } else if domain == "cardio" {
                CardioDetail(detail: detail)
            } else if domain == "mindfulness" {
                MindfulnessDetail(detail: detail)
            }
        }
        .padding(AppLayout.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .chatAttachmentCard(
            background: Color.domainMutedColor(for: domain).opacity(0.72),
            stroke: Color.chatCardBorder
        )
    }
}

private struct StrengthDetail: View {
    let detail: [String: Any]

    var body: some View {
        let exercises = detail["exercises"] as? [[String: Any]] ?? []

        ForEach(Array(exercises.enumerated()), id: \.offset) { _, exercise in
            let name = exercise["name"] as? String ?? ""
            let sets = exercise["sets"] as? Int ?? 0
            let reps: String = {
                if let s = exercise["reps"] as? String { return s }
                if let n = exercise["reps"] as? Int { return "\(n)" }
                return ""
            }()
            let weight = exercise["weight"] as? String

            HStack {
                Text(name)
                    .font(.subheadline)
                    .foregroundStyle(Color.chatPrimaryText)
                Spacer()
                Text("\(sets)×\(reps)\(weight != nil ? " @ \(weight!)" : "")")
                    .font(.system(size: 15))
                    .foregroundStyle(Color.chatSecondaryText)
                    .monospacedDigit()
            }
        }
    }
}

private struct CardioDetail: View {
    let detail: [String: Any]

    var body: some View {
        let type = detail["type"] as? String ?? ""
        let duration = detail["durationMinutes"] as? Int ?? 0

        HStack(spacing: 12) {
            Label(type.replacingOccurrences(of: "_", with: " ").capitalized, systemImage: "heart.fill")
                .font(.subheadline)
                .foregroundStyle(Color.domainCardio)
            Spacer()
            Text("\(duration) min")
                .font(.subheadline)
                .foregroundStyle(Color.textMuted)
                .monospacedDigit()
        }
    }
}

private struct MindfulnessDetail: View {
    let detail: [String: Any]

    var body: some View {
        let type = detail["type"] as? String ?? detail["sessionType"] as? String ?? ""
        let duration = detail["durationMinutes"] as? Int ?? 0

        HStack(spacing: 12) {
            Label(type.capitalized, systemImage: "brain.head.profile")
                .font(.subheadline)
                .foregroundStyle(Color.domainMindfulness)
            Spacer()
            Text("\(duration) min")
                .font(.subheadline)
                .foregroundStyle(Color.textMuted)
                .monospacedDigit()
        }
    }
}
