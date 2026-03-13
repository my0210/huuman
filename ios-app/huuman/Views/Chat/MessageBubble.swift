import SwiftUI

struct MessageBubble: View {
    let message: ChatMessage

    var body: some View {
        HStack {
            if message.role == .user { Spacer(minLength: 60) }

            VStack(alignment: message.role == .user ? .trailing : .leading, spacing: 8) {
                ForEach(message.parts) { part in
                    partView(part)
                }
            }
            .containerRelativeFrame(.horizontal) { width, _ in width * 0.80 }

            if message.role == .assistant { Spacer(minLength: 60) }
        }
        .padding(.horizontal, 16)
    }

    @ViewBuilder
    private func partView(_ part: MessagePart) -> some View {
        switch part {
        case .text(_, let content):
            if !content.isEmpty {
                Text(content)
                    .font(.subheadline)
                    .foregroundStyle(Color.textPrimary)
                    .lineSpacing(4)
                    .padding(message.role == .user ? EdgeInsets(top: 10, leading: 14, bottom: 10, trailing: 14) : EdgeInsets())
                    .background(
                        message.role == .user
                            ? AnyShapeStyle(Color.surfaceRaised)
                            : AnyShapeStyle(.clear),
                        in: message.role == .user
                            ? UnevenRoundedRectangle(topLeadingRadius: 18, bottomLeadingRadius: 18, bottomTrailingRadius: 6, topTrailingRadius: 18)
                            : UnevenRoundedRectangle(topLeadingRadius: 0, bottomLeadingRadius: 0, bottomTrailingRadius: 0, topTrailingRadius: 0)
                    )
            }

        case .image(_, let url, _):
            AsyncImage(url: URL(string: url)) { image in
                image.resizable().aspectRatio(contentMode: .fit)
            } placeholder: {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.surfaceRaised)
                    .frame(height: 200)
                    .overlay(ProgressView().tint(Color.textMuted))
            }
            .frame(maxHeight: 256)
            .clipShape(RoundedRectangle(cornerRadius: 12))

        case .toolLoading(_, let toolName):
            ToolLoadingCard(toolName: toolName)

        case .toolResult(_, let toolName, let output):
            ToolResultView(toolName: toolName, output: output)

        case .toolError:
            Text("Something went wrong. Try again.")
                .font(.caption)
                .foregroundStyle(Color.semanticError)
                .padding(AppLayout.cardPadding)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.semanticError.opacity(0.1), in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
        }
    }
}

struct ToolLoadingCard: View {
    let toolName: String

    private var label: String {
        let labels: [String: String] = [
            "show_today_plan": "Loading today's plan...",
            "show_week_plan": "Loading week plan...",
            "show_session": "Loading session...",
            "complete_session": "Completing session...",
            "log_session": "Logging session...",
            "show_progress": "Checking progress...",
            "log_daily": "Logging...",
            "adapt_plan": "Adapting plan...",
            "generate_plan": "Generating your plan...",
            "confirm_plan": "Locking in your plan...",
            "start_timer": "Starting timer...",
            "search_youtube": "Searching videos...",
            "save_progress_photo": "Saving progress photo...",
            "save_meal_photo": "Logging meal...",
            "log_weight": "Logging weight...",
        ]
        return labels[toolName] ?? "Working on it..."
    }

    var body: some View {
        HStack(spacing: 8) {
            ProgressView()
                .tint(Color.textMuted)
                .controlSize(.small)
            Text(label)
                .font(.caption)
                .foregroundStyle(Color.textMuted)
        }
        .padding(AppLayout.cardPadding)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius))
    }
}
