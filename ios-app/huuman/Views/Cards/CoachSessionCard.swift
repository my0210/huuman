import SwiftUI

struct CoachSessionCard: View {
    let data: [String: Any]

    var body: some View {
        let domain = data["domain"] as? String ?? ""
        let title = data["title"] as? String ?? "Session"
        let isExtra = data["isExtra"] as? Bool ?? false

        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 2)
                .fill(Color.semanticSuccess)
                .frame(width: 3)

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.caption)
                        .foregroundStyle(Color.semanticSuccess)
                    Text(isExtra ? "Extra session logged" : "Session completed")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.semanticSuccess)
                }

                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(Color.textPrimary)

                Text(domain.capitalized)
                    .font(.caption2)
                    .foregroundStyle(Color.domainColor(for: domain))
            }

            Spacer()
        }
        .padding(AppLayout.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.semanticSuccess.opacity(0.08), in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
    }
}
