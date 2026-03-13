import SwiftUI

struct MessageBubble: View {
    let message: ChatMessage

    private var isUser: Bool {
        message.role == .user
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 0) {
            if isUser { Spacer(minLength: 60) }

            VStack(alignment: isUser ? .trailing : .leading, spacing: 6) {
                ForEach(message.parts) { part in
                    partView(part)
                }
            }

            if !isUser { Spacer(minLength: 44) }
        }
        .padding(.horizontal, 14)
    }

    @ViewBuilder
    private func partView(_ part: MessagePart) -> some View {
        switch part {
        case .text(_, let content):
            if !content.isEmpty {
                if isUser {
                    Text(content)
                        .font(.body)
                        .foregroundStyle(Color.textPrimary)
                        .lineSpacing(4)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.userBubble, in: UserBubbleShape())
                } else {
                    Text(content)
                        .font(.body)
                        .foregroundStyle(Color.textPrimary)
                        .lineSpacing(4)
                        .padding(.vertical, 2)
                }
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

private struct UserBubbleShape: Shape {
    func path(in rect: CGRect) -> Path {
        UnevenRoundedRectangle(
            topLeadingRadius: 18,
            bottomLeadingRadius: 18,
            bottomTrailingRadius: 4,
            topTrailingRadius: 18
        ).path(in: rect)
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
