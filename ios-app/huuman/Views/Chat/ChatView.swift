import SwiftUI

struct ChatView: View {
    var body: some View {
        ChatScreen()
    }
}

struct ChatScreen: View {
    @Environment(AuthManager.self) private var auth
    @State private var viewModel = ChatViewModel()
    @State private var showProfile = false
    @State private var showComposerSheet = false
    @State private var pendingImages: [PendingImage] = []
    @State private var photoProvider = RecentPhotosProvider()

    private var threadItems: [ThreadItem] {
        ChatThreadBuilder.items(from: viewModel.messages)
    }

    private let quickActions: [ChatQuickAction] = [
        .init(id: "today", title: "Today's plan", message: "Show me today's plan", icon: "calendar"),
        .init(id: "week", title: "This week", message: "Show me my week", icon: "calendar.badge.clock"),
        .init(id: "adjust", title: "Adjust plan", message: "I want to adjust my plan for the rest of the week", icon: "slider.horizontal.3"),
        .init(id: "progress", title: "Progress", message: "How am I doing this week?", icon: "chart.line.uptrend.xyaxis"),
        .init(id: "log", title: "Log my day", message: "I want to log my day", icon: "list.clipboard"),
        .init(id: "feedback", title: "Feedback", message: "I want to give feedback about huuman", icon: "bubble.left")
    ]

    var body: some View {
        NavigationStack {
            ChatThreadView(
                items: threadItems,
                hasMoreMessages: viewModel.hasMoreMessages && !viewModel.messages.isEmpty,
                isThinking: viewModel.isThinking,
                scrollTrigger: viewModel.scrollTrigger,
                userScrolledAway: $viewModel.userScrolledAway,
                onLoadOlderMessages: { await viewModel.loadOlderMessages() }
            )
            .safeAreaBar(edge: .bottom) {
                ChatComposerBar(
                    onSend: { text, images in
                        viewModel.send(text: text, images: images)
                    },
                    onPlusTap: { showComposerSheet = true },
                    isLoading: viewModel.isStreaming,
                    pendingImages: $pendingImages
                )
            }
            .background(Color.chatBackground)
            .navigationTitle("huuman")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showProfile = true
                    } label: {
                        Image(systemName: "person.circle")
                    }
                    .accessibilityLabel("Profile")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(destination: DataView()) {
                        Image(systemName: "chart.bar.xaxis")
                    }
                    .accessibilityLabel("Your data")
                }
            }
            .sheet(isPresented: $showProfile) {
                ProfileSheetView()
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
                    .environment(auth)
            }
            .sheet(isPresented: $showComposerSheet) {
                ComposerActionsSheet(
                    provider: photoProvider,
                    existingPendingImages: pendingImages,
                    quickActions: quickActions,
                    onQuickAction: { action in
                        viewModel.send(text: action.message)
                    },
                    onDone: { updatedImages in
                        pendingImages = updatedImages
                    }
                )
            }
            .task {
                await viewModel.loadChat()
                photoProvider.loadIfAuthorized()
            }
            .overlay(alignment: .top) {
                if let errorText = viewModel.error {
                    Text(errorText)
                        .font(.footnote.weight(.medium))
                        .foregroundStyle(Color.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .padding(.top, 8)
                        .transition(.move(edge: .top).combined(with: .opacity))
                        .onTapGesture { viewModel.error = nil }
                }
            }
            .animation(.easeOut(duration: 0.2), value: viewModel.error != nil)
            .task(id: viewModel.error) {
                guard viewModel.error != nil else { return }
                try? await Task.sleep(for: .seconds(3))
                viewModel.error = nil
            }
        }
    }
}

private struct ScrollBottomState: Equatable {
    let isNearBottom: Bool
    let containerHeight: CGFloat
}

struct ChatThreadView: View {
    let items: [ThreadItem]
    let hasMoreMessages: Bool
    let isThinking: Bool
    let scrollTrigger: Int
    @Binding var userScrolledAway: Bool
    let onLoadOlderMessages: () async -> Void

    @State private var isNearBottom = true
    @State private var isScrollingDisabled = false
    private let bottomAnchorID = "thread-bottom-anchor"

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 0) {
                    if hasMoreMessages {
                        ProgressView()
                            .tint(Color.chatSecondaryText)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .onAppear {
                                Task { await onLoadOlderMessages() }
                            }
                    }

                    ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                        threadRow(for: item)
                            .id(item.id)
                            .padding(.top, spacing(before: index))
                            .transition(.opacity.combined(with: .offset(y: 6)))
                    }

                    if isThinking {
                        HStack {
                            ThinkingIndicator()
                            Spacer()
                        }
                        .padding(.top, ChatTokens.assistantContinuationSpacing)
                    }

                }
                .scenePadding([.horizontal, .bottom])

                Color.clear
                    .frame(height: 1)
                    .id(bottomAnchorID)
            }
            .defaultScrollAnchor(.bottom)
            .scrollDisabled(isScrollingDisabled)
            .scrollDismissesKeyboard(.interactively)
            .onScrollGeometryChange(for: ScrollBottomState.self) { geometry in
                let distanceFromBottom = geometry.contentSize.height - geometry.contentOffset.y - geometry.containerSize.height
                return ScrollBottomState(
                    isNearBottom: distanceFromBottom < 160,
                    containerHeight: geometry.containerSize.height
                )
            } action: { oldState, newState in
                let containerResized = oldState.containerHeight != newState.containerHeight

                if !newState.isNearBottom && isNearBottom && !containerResized {
                    userScrolledAway = true
                }
                isNearBottom = newState.isNearBottom
                if newState.isNearBottom {
                    userScrolledAway = false
                }
            }
            .onScrollGeometryChange(for: CGFloat.self) { geometry in
                geometry.containerSize.height
            } action: { oldHeight, newHeight in
                if oldHeight > newHeight {
                    proxy.scrollTo(bottomAnchorID, anchor: .bottom)
                }
            }
            .onChange(of: items.last?.id) { oldValue, _ in
                if oldValue == nil {
                    proxy.scrollTo(bottomAnchorID, anchor: .bottom)
                    Task { @MainActor in
                        try? await Task.sleep(for: .milliseconds(300))
                        proxy.scrollTo(bottomAnchorID, anchor: .bottom)
                    }
                } else {
                    withAnimation(.easeOut(duration: 0.12)) {
                        proxy.scrollTo(bottomAnchorID, anchor: .bottom)
                    }
                }
            }
            .onChange(of: scrollTrigger) { _, _ in
                guard !userScrolledAway else { return }
                proxy.scrollTo(bottomAnchorID, anchor: .bottom)
            }
            .overlay(alignment: .bottomTrailing) {
                if !isNearBottom {
                    Button {
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        userScrolledAway = false
                        isScrollingDisabled = true
                        Task { @MainActor in
                            isScrollingDisabled = false
                            withAnimation(.easeOut(duration: 0.25)) {
                                proxy.scrollTo(bottomAnchorID, anchor: .bottom)
                            }
                        }
                    } label: {
                        Image(systemName: "chevron.down")
                    }
                    .buttonStyle(.glass)
                    .scenePadding(.horizontal)
                    .padding(.bottom, 12)
                    .transition(.scale(scale: 0.92).combined(with: .opacity))
                }
            }
        }
    }

    @ViewBuilder
    private func threadRow(for item: ThreadItem) -> some View {
        switch item {
        case .daySeparator(let dayItem):
            ChatDaySeparator(date: dayItem.date)

        case .userTurn(let userTurn):
            UserMessageBubble(viewModel: userTurn)

        case .assistantTurn(let assistantTurn):
            AssistantTurnView(viewModel: assistantTurn)

        case .systemEvent(let event):
            SystemEventChip(text: event.text)
        }
    }

    private func spacing(before index: Int) -> CGFloat {
        guard index > 0 else { return 0 }

        let previous = items[index - 1]
        let current = items[index]

        switch current {
        case .daySeparator:
            return ChatTokens.daySeparatorVerticalPadding

        case .userTurn:
            switch previous {
            case .userTurn:
                return ChatTokens.userClusterSpacing
            case .daySeparator:
                return ChatTokens.daySeparatorToTurnSpacing
            default:
                return ChatTokens.turnSpacing
            }

        case .assistantTurn:
            switch previous {
            case .assistantTurn:
                return ChatTokens.assistantContinuationSpacing
            case .daySeparator:
                return ChatTokens.daySeparatorToTurnSpacing
            default:
                return ChatTokens.turnSpacing
            }

        case .systemEvent:
            return ChatTokens.turnSpacing
        }
    }
}

struct ChatDaySeparator: View {
    let date: Date

    private var label: String {
        if Calendar.current.isDateInToday(date) {
            return "Today"
        }

        if Calendar.current.isDateInYesterday(date) {
            return "Yesterday"
        }

        return date.formatted(.dateTime.weekday(.wide).month(.abbreviated).day())
    }

    var body: some View {
        Text(label)
            .font(.footnote.weight(.medium))
            .foregroundStyle(Color.chatTertiaryText)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 2)
    }
}

struct UserMessageBubble: View {
    let viewModel: UserTurnViewModel

    var body: some View {
        let hasImages = !viewModel.images.isEmpty
        let hasText = viewModel.text != nil

        if hasImages || hasText {
            VStack(alignment: .trailing, spacing: 4) {
                if hasImages {
                    UserImageStrip(images: viewModel.images)
                }

                if let text = viewModel.text {
                    Text(text)
                        .font(.body)
                        .foregroundStyle(Color.white)
                        .lineSpacing(3)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.userBubble, in: RoundedRectangle(cornerRadius: ChatTokens.userBubbleRadius, style: .continuous))
                }
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
        }
    }
}

private struct UserImageStrip: View {
    let images: [DisplayImage]

    private let imageHeight: CGFloat = 180
    private let multiImageWidth: CGFloat = 140

    private let imageSpacing: CGFloat = 6

    private var contentWidth: CGFloat {
        CGFloat(images.count) * multiImageWidth + CGFloat(images.count - 1) * imageSpacing
    }

    var body: some View {
        if images.count == 1 {
            singleImageView(images[0])
                .frame(maxWidth: 260, maxHeight: 260)
        } else {
            GeometryReader { geo in
                if contentWidth > geo.size.width {
                    ScrollView(.horizontal, showsIndicators: false) {
                        multiImageRow
                    }
                    .defaultScrollAnchor(.trailing)
                } else {
                    multiImageRow
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
            }
            .frame(height: imageHeight)
        }
    }

    private var multiImageRow: some View {
        HStack(spacing: imageSpacing) {
            ForEach(images) { img in
                imageView(img)
                    .frame(width: multiImageWidth, height: imageHeight)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
        }
    }

    @ViewBuilder
    private func singleImageView(_ img: DisplayImage) -> some View {
        switch img {
        case .local(_, let uiImage):
            Image(uiImage: uiImage)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        case .remote(_, let url):
            AsyncImage(url: URL(string: url)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                case .failure:
                    imagePlaceholder(failed: true, width: 200, height: 150)
                default:
                    imagePlaceholder(failed: false, width: 200, height: 150)
                }
            }
        }
    }

    @ViewBuilder
    private func imageView(_ img: DisplayImage) -> some View {
        switch img {
        case .local(_, let uiImage):
            Image(uiImage: uiImage)
                .resizable()
                .aspectRatio(contentMode: .fill)
        case .remote(_, let url):
            AsyncImage(url: URL(string: url)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure:
                    imagePlaceholder(failed: true, width: multiImageWidth, height: imageHeight)
                default:
                    imagePlaceholder(failed: false, width: multiImageWidth, height: imageHeight)
                }
            }
        }
    }

    private func imagePlaceholder(failed: Bool, width: CGFloat, height: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: 14, style: .continuous)
            .fill(Color.white.opacity(0.06))
            .frame(width: width, height: height)
            .overlay {
                if failed {
                    Image(systemName: "photo")
                        .foregroundStyle(Color.chatTertiaryText)
                } else {
                    ProgressView()
                        .tint(Color.chatSecondaryText)
                }
            }
    }
}

struct AssistantTurnView: View {
    let viewModel: AssistantTurnViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: ChatTokens.assistantBlockSpacing) {
            ForEach(viewModel.blocks) { block in
                blockView(block)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder
    private func blockView(_ block: AssistantBlock) -> some View {
        switch block {
        case .paragraph(let paragraph):
            AssistantRichTextBlock(markdown: paragraph.markdown)

        case .toolAttachment(let attachment):
            ToolResultView(toolName: attachment.toolName, output: attachment.output)
                .frame(maxWidth: .infinity, alignment: .leading)

        case .toolLoading(let loading):
            ToolLoadingCard(toolName: loading.toolName)
                .frame(maxWidth: .infinity, alignment: .leading)

        case .videoCard(let card):
            VideoCardView(model: card)

        case .linkCard(let card):
            LinkCardView(model: card)

        case .inlineNotice(let notice):
            InlineNoticeView(text: notice.text, isError: notice.isError)
        }
    }
}

struct AssistantRichTextBlock: View {
    let markdown: String

    private var attributedMarkdown: AttributedString? {
        try? AttributedString(
            markdown: markdown,
            options: AttributedString.MarkdownParsingOptions(
                interpretedSyntax: .inlineOnlyPreservingWhitespace
            )
        )
    }

    var body: some View {
        Group {
            if let attributedMarkdown {
                Text(attributedMarkdown)
            } else {
                Text(markdown)
            }
        }
        .font(.body)
        .foregroundStyle(Color.chatPrimaryText)
        .lineSpacing(3)
        .multilineTextAlignment(.leading)
        .fixedSize(horizontal: false, vertical: true)
    }
}

struct VideoCardView: View {
    let model: VideoCardModel
    @Environment(\.openURL) private var openURL

    var body: some View {
        Button {
            guard let url = URL(string: model.urlString) else { return }
            openURL(url)
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.chatAccent.opacity(0.18))
                    Image(systemName: "play.fill")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(Color.chatAccent)
                }
                .frame(width: 48, height: 48)

                VStack(alignment: .leading, spacing: 4) {
                    Text(model.title)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Color.chatPrimaryText)
                        .multilineTextAlignment(.leading)
                        .lineLimit(2)

                    Text(model.subtitle)
                        .font(.footnote.weight(.medium))
                        .foregroundStyle(Color.chatSecondaryText)
                        .lineLimit(1)
                }

                Spacer(minLength: 12)

                Image(systemName: "arrow.up.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Color.chatTertiaryText)
            }
            .padding(14)
            .background(Color.chatCardSurface, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: AppLayout.cardRadius, style: .continuous)
                    .stroke(Color.chatCardBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

struct LinkCardView: View {
    let model: LinkCardModel
    @Environment(\.openURL) private var openURL

    var body: some View {
        Button {
            guard let url = URL(string: model.urlString) else { return }
            openURL(url)
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Color.white.opacity(0.08))
                    Image(systemName: model.iconSystemName)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Color.chatSecondaryText)
                }
                .frame(width: 48, height: 48)

                VStack(alignment: .leading, spacing: 4) {
                    Text(model.title)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Color.chatPrimaryText)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    Text(model.subtitle)
                        .font(.footnote.weight(.medium))
                        .foregroundStyle(Color.chatSecondaryText)
                        .lineLimit(1)
                }

                Spacer(minLength: 12)

                Image(systemName: "chevron.right")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Color.chatTertiaryText)
            }
            .padding(14)
            .background(Color.chatCardSurface, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: AppLayout.cardRadius, style: .continuous)
                    .stroke(Color.chatCardBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

struct SystemEventChip: View {
    let text: String

    var body: some View {
        Text(text)
            .font(.footnote.weight(.medium))
            .foregroundStyle(Color.chatSecondaryText)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(Color.white.opacity(0.06), in: Capsule(style: .continuous))
            .overlay(
                Capsule(style: .continuous)
                    .stroke(Color.chatCardBorder, lineWidth: 1)
            )
            .frame(maxWidth: .infinity)
    }
}

private struct InlineNoticeView: View {
    let text: String
    let isError: Bool

    var body: some View {
        Text(text)
            .font(.footnote.weight(.medium))
            .foregroundStyle(isError ? Color.semanticError : Color.chatSecondaryText)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(
                isError ? Color.semanticError.opacity(0.12) : Color.chatCardSurface,
                in: RoundedRectangle(cornerRadius: AppLayout.cardRadius, style: .continuous)
            )
    }
}

struct InitialAvatar: View {
    let name: String
    let size: CGFloat

    private var textStyle: Font {
        switch size {
        case ...28:
            return .caption2.weight(.semibold)
        case 29...40:
            return .caption.weight(.semibold)
        default:
            return .subheadline.weight(.semibold)
        }
    }

    var body: some View {
        Text(String(name.prefix(1)).uppercased())
            .font(textStyle)
            .foregroundStyle(Color.chatSecondaryText)
            .frame(width: size, height: size)
            .background(Color.white.opacity(0.08), in: Circle())
            .overlay(
                Circle()
                    .stroke(Color.chatCardBorder, lineWidth: 1)
            )
    }
}

struct ThinkingIndicator: View {
    var body: some View {
        TimelineView(.animation) { context in
            let time = context.date.timeIntervalSinceReferenceDate
            HStack(spacing: 6) {
                ForEach(0..<3, id: \.self) { index in
                    Circle()
                        .fill(Color.chatSecondaryText)
                        .frame(width: 7, height: 7)
                        .offset(y: dotOffset(time: time, index: index))
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 16)
        .background(Color.chatCardSurface, in: RoundedRectangle(cornerRadius: AppLayout.cardRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: AppLayout.cardRadius, style: .continuous)
                .stroke(Color.chatCardBorder, lineWidth: 1)
        )
    }

    private func dotOffset(time: Double, index: Int) -> CGFloat {
        let phase = sin(time * .pi * 2.0 / 0.9 - Double(index) * 0.5)
        return phase * 1.5
    }
}

private enum ChatTokens {
    static let turnSpacing: CGFloat = 16
    static let userClusterSpacing: CGFloat = 2
    static let assistantContinuationSpacing: CGFloat = 12
    static let assistantBlockSpacing: CGFloat = 10
    static let daySeparatorVerticalPadding: CGFloat = 24
    static let daySeparatorToTurnSpacing: CGFloat = 6
    static let userBubbleRadius: CGFloat = 20
}

#if DEBUG

#Preview("Chat Shell") {
    ChatShellPreview(messages: fullConversationAllCards)
}

#Preview("Chat Shell — Text") {
    ChatShellPreview(messages: [
        ChatMessage(
            role: .assistant,
            parts: [.text(id: "a1", content: "Good morning. Your recovery looks decent, so I'd keep today's plan intact and bias the main set slightly easier if your legs still feel flat.")]
        ),
        ChatMessage(
            role: .user,
            parts: [.text(id: "u1", content: "Makes sense. Show me the session.")]
        ),
        ChatMessage(
            role: .assistant,
            parts: [.toolResult(id: "tr1", toolName: "show_session", output: MockData.sessionDetailStrength)]
        )
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
        parts: [.text(id: "t15", content: "Any good videos?")]
    ),
    ChatMessage(
        role: .assistant,
        parts: [
            .text(
                id: "t16",
                content: """
                Here are three options that fit your current week.

                - [Perfect Push Day in 25 Minutes](https://youtube.com/watch?v=example1)
                - [Zone 2 Training Explained](https://youtube.com/watch?v=example2)
                """
            ),
            .toolResult(id: "tr8", toolName: "search_youtube", output: MockData.youtubeResults)
        ]
    ),
    ChatMessage(
        role: .assistant,
        parts: [.toolResult(id: "tr9", toolName: "save_feedback", output: [:])]
    )
]

private struct ChatShellPreview: View {
    let messages: [ChatMessage]
    @State private var userScrolledAway = false
    @State private var pendingImages: [PendingImage] = []

    var body: some View {
        NavigationStack {
            ChatThreadView(
                items: ChatThreadBuilder.items(from: messages),
                hasMoreMessages: false,
                isThinking: false,
                scrollTrigger: 0,
                userScrolledAway: $userScrolledAway,
                onLoadOlderMessages: { await Task.yield() }
            )
            .safeAreaBar(edge: .bottom) {
                ChatComposerBar(
                    onSend: { _, _ in },
                    onPlusTap: {},
                    isLoading: false,
                    pendingImages: $pendingImages
                )
            }
            .background(Color.chatBackground)
            .navigationTitle("huuman")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {} label: {
                        Image(systemName: "person.circle")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Image(systemName: "chart.bar.xaxis")
                }
            }
        }
    }
}

#endif
