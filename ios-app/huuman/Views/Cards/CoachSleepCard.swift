import SwiftUI

struct CoachSleepCard: View {
    let data: [String: Any]

    var body: some View {
        let logged = data["logged"] as? [String: Any] ?? [:]
        let hours = logged["sleep_hours"] as? Double ?? 0

        HStack(spacing: 10) {
            Image(systemName: "moon.fill")
                .foregroundStyle(Color.domainSleep)
                .font(.subheadline)

            VStack(alignment: .leading, spacing: 2) {
                Text("Sleep logged")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.domainSleep)
                Text("\(String(format: "%.1f", hours)) hours")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(Color.textPrimary)
                    .monospacedDigit()
            }

            Spacer()
        }
        .padding(AppLayout.cardPadding)
        .background(Color.domainSleepMuted, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
    }
}
