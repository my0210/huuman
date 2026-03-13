import SwiftUI

struct ChatView: View {
    @Environment(AuthManager.self) private var auth
    @State private var viewModel = ChatViewModel()
    @State private var showProfile = false
    @State private var showCommandMenu = false
    @State private var topGlassOpacity: CGFloat = 0
    @State private var isNearBottom = true

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                VStack(spacing: 0) {
                    ScrollViewReader { proxy in
                        ScrollView {
                            LazyVStack(spacing: 0) {
                                if viewModel.hasMoreMessages && !viewModel.messages.isEmpty {
                                    ProgressView()
                                        .tint(Color.textMuted)
                                        .frame(maxWidth: .infinity)
                                        .padding(.vertical, 8)
                                        .onAppear {
                                            Task { await viewModel.loadOlderMessages() }
                                        }
                                }

                                ForEach(Array(viewModel.messages.enumerated()), id: \.element.id) { index, message in
                                    VStack(spacing: 0) {
                                        if shouldShowTimestamp(at: index) {
                                            timestampLabel(for: message.createdAt)
                                        }

                                        MessageBubble(message: message)
                                            .id(message.id)
                                            .padding(.top, spacingBefore(index: index))
                                            .transition(.opacity.combined(with: .offset(y: 12)))
                                    }
                                }

                                if viewModel.isThinking {
                                    HStack {
                                        ThinkingIndicator()
                                        Spacer()
                                    }
                                    .padding(.horizontal, 16)
                                    .padding(.top, 4)
                                }

                                Color.clear.frame(height: 1).id("bottom")
                            }
                            .padding(.vertical, 16)
                        }
                        .defaultScrollAnchor(.bottom)
                        .scrollDismissesKeyboard(.interactively)
                        .onScrollGeometryChange(for: Bool.self) { geo in
                            let dist = geo.contentSize.height - geo.contentOffset.y - geo.containerSize.height
                            return dist < 80
                        } action: { _, isNear in
                            isNearBottom = isNear
                        }
                        .onScrollGeometryChange(for: CGFloat.self) { geo in
                            geo.contentOffset.y
                        } action: { _, offset in
                            let opacity = min(max((offset - 20) / 60, 0), 1)
                            if abs(topGlassOpacity - opacity) > 0.02 {
                                withAnimation(.easeOut(duration: 0.18)) {
                                    topGlassOpacity = opacity
                                }
                            }
                        }
                        .onChange(of: viewModel.messages.count) {
                            if isNearBottom {
                                withAnimation(.easeOut(duration: 0.2)) { proxy.scrollTo("bottom") }
                            }
                        }
                        .onChange(of: viewModel.scrollTrigger) {
                            if isNearBottom { proxy.scrollTo("bottom") }
                        }
                        .overlay(alignment: .bottomTrailing) {
                            if !isNearBottom {
                                Button {
                                    withAnimation(.easeOut(duration: 0.25)) { proxy.scrollTo("bottom") }
                                } label: {
                                    Image(systemName: "chevron.down")
                                        .font(.body.weight(.semibold))
                                        .foregroundStyle(Color.textSecondary)
                                        .frame(width: 36, height: 36)
                                        .background(.ultraThinMaterial, in: Circle())
                                        .shadow(color: .black.opacity(0.2), radius: 8, y: 2)
                                }
                                .frame(minWidth: 44, minHeight: 44)
                                .padding(.trailing, 16)
                                .padding(.bottom, 8)
                                .transition(.scale(scale: 0.8).combined(with: .opacity))
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

    private func spacingBefore(index: Int) -> CGFloat {
        guard index > 0 else { return 0 }
        let prev = viewModel.messages[index - 1]
        let curr = viewModel.messages[index]
        if shouldShowTimestamp(at: index) { return 0 }
        return prev.role == curr.role ? 4 : 16
    }

    private func shouldShowTimestamp(at index: Int) -> Bool {
        guard index > 0 else { return true }
        let prev = viewModel.messages[index - 1].createdAt
        let curr = viewModel.messages[index].createdAt
        return curr.timeIntervalSince(prev) > 300 || !Calendar.current.isDate(prev, inSameDayAs: curr)
    }

    private func timestampLabel(for date: Date) -> some View {
        Text(date, format: .dateTime.hour().minute())
            .font(.caption2)
            .foregroundStyle(Color.textMuted)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
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
    ChatPreview(messages: fullConversationAllCards)
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
        ChatMessage(role: .assistant, parts: [
            .toolResult(id: "tr7", toolName: "show_week_plan", output: MockData.weekPlan),
        ]),
        ChatMessage(role: .assistant, parts: [
            .toolResult(id: "tr8", toolName: "generate_plan", output: MockData.draftPlan),
        ]),
        ChatMessage(role: .assistant, parts: [
            .toolResult(id: "tr9", toolName: "log_session", output: MockData.extraSessionLogged),
        ]),
        ChatMessage(role: .assistant, parts: [
            .toolResult(id: "tr10", toolName: "show_session", output: MockData.sessionDetailCardio),
        ]),
        ChatMessage(role: .assistant, parts: [
            .toolResult(id: "tr11", toolName: "show_session", output: MockData.sessionDetailMindfulness),
        ]),
        ChatMessage(role: .assistant, parts: [
            .toolResult(id: "tr12", toolName: "log_daily", output: MockData.dailyLogFull),
        ]),
        ChatMessage(role: .assistant, parts: [
            .toolResult(id: "tr13", toolName: "adapt_plan", output: MockData.adaptedSession),
        ]),
        ChatMessage(role: .assistant, parts: [
            .toolResult(id: "tr14", toolName: "search_youtube", output: MockData.youtubeResults),
        ]),
        ChatMessage(role: .assistant, parts: [
            .toolResult(id: "tr15", toolName: "save_progress_photo", output: MockData.progressPhotoSaved),
        ]),
        ChatMessage(role: .assistant, parts: [
            .toolResult(id: "tr16", toolName: "save_meal_photo", output: MockData.mealPhotoSaved),
        ]),
    ])
}

private let fullConversationAllCards: [ChatMessage] = MockData.fullConversation + [
    ChatMessage(
        role: .user,
        parts: [.text(id: "t14", content: "Can you draft next week for me?")]
    ),
    ChatMessage(
        role: .assistant,
        parts: [.toolResult(id: "tr7", toolName: "generate_plan", output: MockData.draftPlan)]
    ),
    ChatMessage(
        role: .user,
        parts: [.text(id: "t15", content: "I did an extra run today")]
    ),
    ChatMessage(
        role: .assistant,
        parts: [.toolResult(id: "tr8", toolName: "log_session", output: MockData.extraSessionLogged)]
    ),
    ChatMessage(
        role: .user,
        parts: [.text(id: "t16", content: "Show me cardio details")]
    ),
    ChatMessage(
        role: .assistant,
        parts: [.toolResult(id: "tr9", toolName: "show_session", output: MockData.sessionDetailCardio)]
    ),
    ChatMessage(
        role: .user,
        parts: [.text(id: "t17", content: "Show me mindfulness details")]
    ),
    ChatMessage(
        role: .assistant,
        parts: [.toolResult(id: "tr10", toolName: "show_session", output: MockData.sessionDetailMindfulness)]
    ),
    ChatMessage(
        role: .user,
        parts: [.text(id: "t18", content: "Log my full day")]
    ),
    ChatMessage(
        role: .assistant,
        parts: [.toolResult(id: "tr11", toolName: "log_daily", output: MockData.dailyLogFull)]
    ),
    ChatMessage(
        role: .user,
        parts: [.text(id: "t19", content: "Move Thursday's session")]
    ),
    ChatMessage(
        role: .assistant,
        parts: [.toolResult(id: "tr12", toolName: "adapt_plan", output: MockData.adaptedSession)]
    ),
    ChatMessage(
        role: .user,
        parts: [.text(id: "t20", content: "Any good videos?")]
    ),
    ChatMessage(
        role: .assistant,
        parts: [.toolResult(id: "tr13", toolName: "search_youtube", output: MockData.youtubeResults)]
    ),
    ChatMessage(
        role: .user,
        parts: [.text(id: "t21", content: "Log my weight")]
    ),
    ChatMessage(
        role: .assistant,
        parts: [.toolResult(id: "tr14", toolName: "log_weight", output: MockData.weightLogged)]
    ),
    ChatMessage(
        role: .user,
        parts: [.text(id: "t22", content: "Saved a progress photo")]
    ),
    ChatMessage(
        role: .assistant,
        parts: [.toolResult(id: "tr15", toolName: "save_progress_photo", output: MockData.progressPhotoSaved)]
    ),
    ChatMessage(
        role: .user,
        parts: [.text(id: "t23", content: "Logged my lunch")]
    ),
    ChatMessage(
        role: .assistant,
        parts: [.toolResult(id: "tr16", toolName: "save_meal_photo", output: MockData.mealPhotoSaved)]
    ),
]

private struct ChatPreview: View {
    let messages: [ChatMessage]

    private func spacingBefore(index: Int) -> CGFloat {
        guard index > 0 else { return 0 }
        let prev = messages[index - 1]
        let curr = messages[index]
        return prev.role == curr.role ? 4 : 16
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(Array(messages.enumerated()), id: \.element.id) { index, message in
                            MessageBubble(message: message)
                                .padding(.top, spacingBefore(index: index))
                        }
                    }
                    .padding(.vertical, 16)
                }
                .defaultScrollAnchor(.bottom)
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
