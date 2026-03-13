import SwiftUI

struct ProgressRingsCard: View {
    let data: [String: Any]

    var body: some View {
        let domains = (data["progress"] as? [[String: Any]]) ?? (data["domains"] as? [[String: Any]]) ?? []

        VStack(alignment: .leading, spacing: 14) {
            Text("This week")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Color.chatPrimaryText)

            HStack(spacing: 16) {
                ForEach(Array(domains.enumerated()), id: \.offset) { _, domain in
                    let name = domain["domain"] as? String ?? ""
                    let completed = domain["completed"] as? Int ?? 0
                    let total = domain["total"] as? Int ?? 1
                    let progress = total > 0 ? Double(completed) / Double(total) : 0

                    VStack(spacing: 6) {
                        ZStack {
                            Circle()
                                .stroke(Color.domainMutedColor(for: name), lineWidth: 4)
                            Circle()
                                .trim(from: 0, to: progress)
                                .stroke(Color.domainColor(for: name), style: StrokeStyle(lineWidth: 4, lineCap: .round))
                                .rotationEffect(.degrees(-90))
                            Text("\(completed)/\(total)")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .foregroundStyle(Color.chatSecondaryText)
                                .monospacedDigit()
                        }
                        .frame(width: 48, height: 48)

                        Text(name.prefix(4).capitalized)
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundStyle(Color.domainColor(for: name))
                    }
                }
            }
            .frame(maxWidth: .infinity)
        }
        .padding(AppLayout.cardPadding)
        .chatAttachmentCard()
    }
}
