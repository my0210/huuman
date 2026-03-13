import SwiftUI

struct ChatView: View {
    @Environment(AuthManager.self) private var auth
    @State private var viewModel = ChatViewModel()
    @State private var showProfile = false
    @State private var showCommandMenu = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            if viewModel.hasMoreMessages && !viewModel.messages.isEmpty {
                                ProgressView()
                                    .tint(Color.textMuted)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 8)
                                    .id("load-more")
                                    .onAppear {
                                        Task { await viewModel.loadOlderMessages() }
                                    }
                            }

                            ForEach(viewModel.messages) { message in
                                MessageBubble(message: message)
                                    .id(message.id)
                                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                            }

                            if viewModel.isThinking {
                                HStack {
                                    ThinkingIndicator()
                                    Spacer()
                                }
                                .padding(.horizontal, 16)
                                .id("thinking")
                            }
                        }
                        .padding(.vertical, 16)
                    }
                    .scrollDismissesKeyboard(.interactively)
                    .defaultScrollAnchor(.bottom)
                    .onChange(of: viewModel.messages.count) {
                        if viewModel.isStreaming || viewModel.isThinking {
                            withAnimation(.easeOut(duration: 0.2)) {
                                if viewModel.isThinking {
                                    proxy.scrollTo("thinking", anchor: .bottom)
                                } else if let last = viewModel.messages.last {
                                    proxy.scrollTo(last.id, anchor: .bottom)
                                }
                            }
                        }
                    }
                    .onChange(of: viewModel.lastTextUpdate) {
                        withAnimation(.easeOut(duration: 0.1)) {
                            if let last = viewModel.messages.last {
                                proxy.scrollTo(last.id, anchor: .bottom)
                            }
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
                        InitialAvatar(name: "M", size: AppLayout.avatarSize)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(destination: DataView()) {
                        Image(systemName: "chart.bar")
                            .font(.body)
                            .foregroundStyle(Color.textSecondary)
                    }
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
