import SwiftUI

struct DraftPlanCard: View {
    let data: [String: Any]

    var body: some View {
        let sessions = (data["sessions"] as? [[String: Any]] ?? [])
            .filter { ["cardio", "strength", "mindfulness"].contains($0["domain"] as? String ?? "") }
        let intro = (data["plan"] as? [String: Any])?["intro_message"] as? String

        if sessions.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                Text("Couldn't build the plan this time")
                    .font(.system(size: 15, weight: .medium))
                    .fontWeight(.medium)
                    .foregroundStyle(Color.chatPrimaryText)
                Text("Ask me to try again.")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.chatSecondaryText)
            }
            .padding(AppLayout.cardPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .chatAttachmentCard()
        } else {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text("Draft plan")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color.chatPrimaryText)
                    Spacer()
                    Text("\(sessions.count) sessions")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Color.chatSecondaryText)
                }
                .padding(.horizontal, AppLayout.cardPadding)
                .padding(.vertical, 10)

                Divider().overlay(Color.chatHairline)

                let grouped = groupByDay(sessions)
                ForEach(Array(grouped.enumerated()), id: \.offset) { _, group in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(group.day)
                            .font(.system(size: 14, weight: .medium))
                            .fontWeight(.medium)
                            .foregroundStyle(Color.chatSecondaryText)
                            .padding(.horizontal, AppLayout.cardPadding)
                            .padding(.top, 8)

                        ForEach(Array(group.sessions.enumerated()), id: \.offset) { _, session in
                            let domain = session["domain"] as? String ?? ""
                            let title = session["title"] as? String ?? ""

                            HStack(spacing: 10) {
                                Circle()
                                    .fill(Color.domainColor(for: domain))
                                    .frame(width: 6, height: 6)
                                Text(title)
                                    .font(.subheadline)
                                    .foregroundStyle(Color.chatPrimaryText)
                                Spacer()
                                Text(domain.capitalized)
                                    .font(.caption2)
                                    .foregroundStyle(Color.domainColor(for: domain))
                            }
                            .padding(.horizontal, AppLayout.cardPadding)
                            .padding(.vertical, 4)
                        }
                    }
                }
                .padding(.bottom, 8)

                if let intro, !intro.isEmpty {
                    Divider().overlay(Color.chatHairline)
                    Text(intro)
                        .font(.system(size: 15))
                        .foregroundStyle(Color.chatSecondaryText)
                        .lineSpacing(4)
                        .padding(AppLayout.cardPadding)
                }
            }
            .chatAttachmentCard(background: Color.chatCardSurface, stroke: Color.chatAccent.opacity(0.18))
        }
    }

    private func groupByDay(_ sessions: [[String: Any]]) -> [(day: String, sessions: [[String: Any]])] {
        var groups: [(day: String, sessions: [[String: Any]])] = []
        var current: (day: String, sessions: [[String: Any]])?

        for session in sessions {
            let date = session["scheduledDate"] as? String ?? session["scheduled_date"] as? String ?? ""
            let dayLabel = formatDayLabel(date)
            if current?.day == dayLabel {
                current?.sessions.append(session)
            } else {
                if let c = current { groups.append(c) }
                current = (day: dayLabel, sessions: [session])
            }
        }
        if let c = current { groups.append(c) }
        return groups
    }

    private func formatDayLabel(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        if let date = formatter.date(from: iso) {
            let df = DateFormatter()
            df.dateFormat = "EEE, MMM d"
            return df.string(from: date)
        }
        return iso
    }
}
