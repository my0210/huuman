import SwiftUI

struct CoachSessionCard: View {
    let data: [String: Any]

    var body: some View {
        let domain = data["domain"] as? String ?? ""
        let title = data["title"] as? String ?? "Session"
        let isExtra = data["isExtra"] as? Bool ?? false

        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color.semanticSuccess)
                    Text(isExtra ? "Extra session logged" : "Session completed")
                        .font(.system(size: 14, weight: .semibold))
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.semanticSuccess)
                }

                Text(title)
                    .font(.system(size: 15, weight: .medium))
                    .fontWeight(.medium)
                    .foregroundStyle(Color.chatPrimaryText)

                Text(domain.capitalized)
                    .font(.caption2)
                    .foregroundStyle(Color.domainColor(for: domain))
            }

            Spacer()
        }
        .padding(AppLayout.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .chatAttachmentCard(
            background: Color.semanticSuccess.opacity(0.08),
            stroke: Color.chatCardBorder
        )
    }
}
