import SwiftUI

struct WeekPlanCard: View {
    let data: [String: Any]

    var body: some View {
        let sessions = data["sessions"] as? [[String: Any]] ?? []
        let grouped = groupByDay(sessions)

        VStack(alignment: .leading, spacing: 12) {
            Text("Week Plan")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(Color.textMuted)
                .textCase(.uppercase)
                .tracking(0.5)

            ForEach(grouped, id: \.day) { group in
                VStack(alignment: .leading, spacing: 6) {
                    Text(group.day)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.textTertiary)

                    ForEach(Array(group.sessions.enumerated()), id: \.offset) { _, session in
                        WeekSessionRow(session: session)
                    }
                }
                .padding(.bottom, 4)
            }
        }
        .padding(AppLayout.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
    }

    private func groupByDay(_ sessions: [[String: Any]]) -> [(day: String, sessions: [[String: Any]])] {
        var groups: [(day: String, sessions: [[String: Any]])] = []
        var current: (day: String, sessions: [[String: Any]])?

        for session in sessions {
            let date = session["scheduledDate"] as? String ?? session["day_of_week"] as? String ?? "Unknown"
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
        return iso.capitalized
    }
}

private struct WeekSessionRow: View {
    let session: [String: Any]

    var body: some View {
        let domain = session["domain"] as? String ?? ""
        let title = session["title"] as? String ?? ""
        let status = session["status"] as? String ?? "planned"

        HStack(spacing: 10) {
            Circle()
                .fill(Color.domainColor(for: domain))
                .frame(width: 8, height: 8)
            Text(title)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(status == "completed" ? Color.textMuted : Color.textPrimary)
                .strikethrough(status == "completed")
            Spacer()
            Text(domain.capitalized)
                .font(.caption2)
                .foregroundStyle(Color.domainColor(for: domain))
            if status == "completed" {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(Color.semanticSuccess)
                    .font(.caption)
            }
        }
        .padding(.vertical, 2)
    }
}
