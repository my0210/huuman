import SwiftUI

struct ChatView: View {
    @Environment(AuthManager.self) private var auth
    @State private var viewModel = ChatViewModel()
    @State private var showProfile = false
    @State private var showCommandMenu = false
    @State private var topGlassOpacity: CGFloat = 0

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                VStack(spacing: 0) {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            GeometryReader { proxy in
                                Color.clear
                                    .preference(key: ScrollOffsetKey.self, value: proxy.frame(in: .named("chatScroll")).minY)
                            }
                            .frame(height: 0)
                        if viewModel.isThinking {
                            HStack {
                                ThinkingIndicator()
                                Spacer()
                            }
                            .padding(.horizontal, 16)
                            .scaleEffect(y: -1)
                        }

                        ForEach(viewModel.messages.reversed()) { message in
                            MessageBubble(message: message)
                                .id(message.id)
                                .scaleEffect(y: -1)
                        }

                        if viewModel.hasMoreMessages && !viewModel.messages.isEmpty {
                            ProgressView()
                                .tint(Color.textMuted)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                                .scaleEffect(y: -1)
                                .onAppear {
                                    Task { await viewModel.loadOlderMessages() }
                                }
                        }
                        }
                        .padding(.vertical, 16)
                    }
                    .scaleEffect(y: -1)
                    .scrollDismissesKeyboard(.interactively)
                    .coordinateSpace(name: "chatScroll")
                    .onPreferenceChange(ScrollOffsetKey.self) { value in
                        let absValue = abs(value)
                        let opacity = min(max((absValue - 20) / 60, 0), 1)
                        if abs(topGlassOpacity - opacity) > 0.02 {
                            withAnimation(.easeOut(duration: 0.18)) {
                                topGlassOpacity = opacity
                            }
                        }
                    }

                    if showCommandMenu {
                        CommandMenuView(onSelect: { message in
                            showCommandMenu = false
                            viewModel.send(text: message)
                        })
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                    }

                    InputBar(
                        onSend: { text, images in viewModel.send(text: text, images: images) },
                        onToggleMenu: { withAnimation(.easeOut(duration: 0.15)) { showCommandMenu.toggle() } },
                        isMenuOpen: showCommandMenu,
                        isLoading: viewModel.isStreaming
                    )
                }
                .background(Color.surfaceBase)

                topGlassOverlay
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("huuman")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.textPrimary)
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showProfile = true
                    } label: {
                        InitialAvatar(name: viewModel.userName, size: AppLayout.avatarSize)
                    }
                    .accessibilityLabel("Profile")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(destination: DataView()) {
                        Image(systemName: "chart.bar")
                            .font(.body)
                            .foregroundStyle(Color.textSecondary)
                    }
                    .accessibilityLabel("Your data")
                }
            }
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(Color.surfaceBase, for: .navigationBar)
            .sheet(isPresented: $showProfile) {
                ProfileSheetView()
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
                    .environment(auth)
            }
            .task {
                await viewModel.loadChat()
            }
        }
    }
}

private struct ScrollOffsetKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

private extension ChatView {
    var topGlassOverlay: some View {
        Rectangle()
            .fill(.ultraThinMaterial)
            .mask(
                LinearGradient(
                    colors: [Color.black.opacity(0.9), Color.black.opacity(0.6), .clear],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .frame(height: 48)
            .opacity(topGlassOpacity)
            .allowsHitTesting(false)
    }
}

struct InitialAvatar: View {
    let name: String
    let size: CGFloat

    private var textStyle: Font {
        switch size {
        case ...28: return .caption2.weight(.semibold)
        case 29...40: return .caption.weight(.semibold)
        default: return .subheadline.weight(.semibold)
        }
    }

    var body: some View {
        Text(String(name.prefix(1)).uppercased())
            .font(textStyle)
            .foregroundStyle(Color.textSecondary)
            .frame(width: size, height: size)
            .background(Color.surfaceElevated)
            .clipShape(Circle())
    }
}

struct ThinkingIndicator: View {
    @State private var animate = false

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .fill(Color.textMuted)
                    .frame(width: 6, height: 6)
                    .opacity(animate ? 1 : 0.3)
                    .animation(
                        .easeInOut(duration: 0.6).repeatForever().delay(Double(i) * 0.15),
                        value: animate
                    )
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: 14))
        .onAppear { animate = true }
    }
}

#if DEBUG

#Preview("Chat — Full Conversation") {
    ChatPreview(messages: MockData.fullConversation)
}

#Preview("Chat — Text Only") {
    ChatPreview(messages: [
        ChatMessage(role: .assistant, parts: [.text(id: "a1", content: "Good morning! How did you sleep?")]),
        ChatMessage(role: .user, parts: [.text(id: "u1", content: "About 6 hours. Feeling okay though.")]),
        ChatMessage(role: .assistant, parts: [.text(id: "a2", content: "Not bad. We'll keep today's intensity moderate. Your body can handle it, but let's not push into high RPE territory. I've got a solid session lined up that respects your recovery state.")]),
        ChatMessage(role: .user, parts: [.text(id: "u2", content: "Sounds good, let's do it")]),
    ])
}

#Preview("Chat — Cards Only") {
    ChatPreview(messages: [
        ChatMessage(role: .assistant, parts: [
            .text(id: "a1", content: "Here's your plan for today:"),
            .toolResult(id: "tr1", toolName: "show_today_plan", output: MockData.todayPlan),
        ]),
        ChatMessage(role: .assistant, parts: [
            .text(id: "a2", content: "And your weekly progress:"),
            .toolResult(id: "tr2", toolName: "show_progress", output: MockData.progressRings),
        ]),
        ChatMessage(role: .assistant, parts: [
            .toolResult(id: "tr3", toolName: "show_session", output: MockData.sessionDetailStrength),
        ]),
        ChatMessage(role: .assistant, parts: [
            .toolResult(id: "tr4", toolName: "complete_session", output: MockData.sessionCompleted),
        ]),
        ChatMessage(role: .assistant, parts: [
            .toolResult(id: "tr5", toolName: "log_daily", output: MockData.sleepLogged),
        ]),
        ChatMessage(role: .assistant, parts: [
            .toolResult(id: "tr6", toolName: "log_weight", output: MockData.weightLogged),
        ]),
    ])
}

private struct ChatPreview: View {
    let messages: [ChatMessage]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    LazyVStack(spacing: 16) {
                        ForEach(messages) { message in
                            MessageBubble(message: message)
                        }
                    }
                    .padding(.vertical, 16)
                }
                .scrollDismissesKeyboard(.interactively)

                InputBar(
                    onSend: { _, _ in },
                    onToggleMenu: {},
                    isMenuOpen: false,
                    isLoading: false
                )
            }
            .background(Color.surfaceBase)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("huuman")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.textPrimary)
                }
                ToolbarItem(placement: .topBarLeading) {
                    InitialAvatar(name: "Mehmet", size: AppLayout.avatarSize)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Image(systemName: "chart.bar")
                        .font(.body)
                        .foregroundStyle(Color.textSecondary)
                }
            }
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbarBackground(Color.surfaceBase, for: .navigationBar)
        }
    }
}

#endif
