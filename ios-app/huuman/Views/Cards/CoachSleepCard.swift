import SwiftUI

struct CoachSleepCard: View {
    let data: [String: Any]

    var body: some View {
        let logged = data["logged"] as? [String: Any] ?? [:]
        let hours = logged["sleep_hours"] as? Double ?? 0

        HStack(spacing: 10) {
            Image(systemName: "moon.fill")
                .foregroundStyle(Color.domainSleep)
                .font(.system(size: 15, weight: .semibold))

            VStack(alignment: .leading, spacing: 2) {
                Text("Sleep logged")
                    .font(.system(size: 14, weight: .semibold))
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.domainSleep)
                Text("\(String(format: "%.1f", hours)) hours")
                    .font(.system(size: 15, weight: .medium))
                    .fontWeight(.medium)
                    .foregroundStyle(Color.chatPrimaryText)
                    .monospacedDigit()
            }

            Spacer()
        }
        .padding(AppLayout.cardPadding)
        .chatAttachmentCard(
            background: Color.domainSleepMuted.opacity(0.72),
            stroke: Color.chatCardBorder
        )
    }
}
