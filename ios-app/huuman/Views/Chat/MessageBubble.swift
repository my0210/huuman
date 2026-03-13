import SwiftUI

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
                .tint(Color.chatSecondaryText)
                .controlSize(.small)
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Color.chatSecondaryText)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.chatCardSurface, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: AppLayout.cardRadius, style: .continuous)
                .stroke(Color.chatCardBorder, lineWidth: 1)
        )
    }
}
