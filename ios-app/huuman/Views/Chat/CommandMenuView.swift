import SwiftUI

struct CommandMenuView: View {
    let onSelect: (String) -> Void

    private let commands: [(id: String, label: String, message: String, icon: String)] = [
        ("today", "Today's plan", "Show me today's plan", "calendar"),
        ("week", "This week", "Show me my week", "calendar.badge.clock"),
        ("adjust", "Adjust plan", "I want to adjust my plan for the rest of the week", "slider.horizontal.3"),
        ("progress", "Progress", "How am I doing this week?", "chart.line.uptrend.xyaxis"),
        ("log", "Log", "I want to log my day", "list.clipboard"),
        ("feedback", "Feedback", "I want to give feedback about huuman", "bubble.left")
    ]

    var body: some View {
        VStack(spacing: 0) {
            Divider().overlay(Color.borderSubtle)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(commands, id: \.id) { cmd in
                        Button {
                            onSelect(cmd.message)
                        } label: {
                            VStack(spacing: 8) {
                                Image(systemName: cmd.icon)
                                    .font(.body.weight(.semibold))
                                    .foregroundStyle(Color.textPrimary)
                                    .frame(width: 40, height: 40)
                                    .background(.ultraThinMaterial, in: Circle())
                                    .overlay(Circle().stroke(Color.borderSubtle.opacity(0.8)))

                                Text(cmd.label)
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundStyle(Color.textSecondary)
                                    .multilineTextAlignment(.center)
                                    .lineLimit(2)
                                    .frame(width: 90)
                            }
                            .padding(.vertical, 8)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
            }
            .background(.ultraThinMaterial)
        }
    }
}
