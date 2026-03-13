import SwiftUI

struct CommandMenuView: View {
    let onSelect: (String) -> Void

    private let commands: [(id: String, label: String, message: String, icon: String)] = [
        ("today", "Today's plan", "Show me today's plan", "calendar"),
        ("week", "This week", "Show me my week", "calendar.badge.clock"),
        ("adjust", "Adjust plan", "I want to adjust my plan for the rest of the week", "slider.horizontal.3"),
        ("progress", "Progress", "How am I doing this week?", "chart.line.uptrend.xyaxis"),
        ("log", "Log", "I want to log my day", "list.clipboard"),
        ("feedback", "Feedback", "I want to give feedback about huuman", "bubble.left"),
    ]

    var body: some View {
        VStack(spacing: 0) {
            Divider().overlay(Color.borderSubtle)

            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: 12) {
                ForEach(commands, id: \.id) { cmd in
                    Button {
                        onSelect(cmd.message)
                    } label: {
                        VStack(spacing: 8) {
                            Image(systemName: cmd.icon)
                                .font(.body)
                                .foregroundStyle(Color.textSecondary)
                                .frame(width: AppLayout.buttonMinHeight, height: AppLayout.buttonMinHeight)
                                .background(Color.surfaceElevated, in: Circle())

                            Text(cmd.label)
                                .font(.caption2)
                                .fontWeight(.medium)
                                .foregroundStyle(Color.textTertiary)
                                .multilineTextAlignment(.center)
                                .lineLimit(2)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 4)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(16)
            .background(Color.surfaceOverlay)
        }
    }
}
