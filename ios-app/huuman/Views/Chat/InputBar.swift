import PhotosUI
import SwiftUI
import UIKit

struct ChatQuickAction: Identifiable {
    let id: String
    let title: String
    let message: String
    let icon: String
}

// MARK: - Press Feedback

private struct PressableButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.8 : 1.0)
            .animation(.spring(duration: 0.2, bounce: 0.4), value: configuration.isPressed)
    }
}

// MARK: - Composer Bar

struct ChatComposerBar: View {
    let onSend: (String, [Data]?) -> Void
    let onPlusTap: () -> Void
    let isLoading: Bool

    @State private var text = ""
    @FocusState private var isFocused: Bool

    private var canSend: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isLoading
    }

    var body: some View {
        HStack(alignment: .center, spacing: 16) {
            Button(action: onPlusTap) {
                Image(systemName: "plus")
                    .imageScale(.large)
            }
            .buttonStyle(.glass)
            .controlSize(.large)
            .accessibilityLabel("Attachments and actions")

            HStack(alignment: .bottom, spacing: 0) {
                TextField("Message huuman...", text: $text, axis: .vertical)
                    .lineLimit(1...6)
                    .font(.body)
                    .tint(Color.chatAccent)
                    .focused($isFocused)
                    .padding(.leading)
                    .padding(.vertical, 12)
                    .onSubmit {
                        if canSend { performSend() }
                    }

                Button(action: performSend) {
                    Image(systemName: "arrow.up")
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(canSend ? Color.white : Color.chatTertiaryText)
                        .frame(width: 28, height: 28)
                        .background(
                            canSend ? Color.chatAccent : Color.white.opacity(0.06),
                            in: Circle()
                        )
                }
                .buttonStyle(PressableButtonStyle())
                .disabled(!canSend)
                .accessibilityLabel("Send message")
                .animation(.easeOut(duration: 0.15), value: canSend)
                .frame(minWidth: AppLayout.buttonMinHeight, minHeight: AppLayout.buttonMinHeight)
            }
            .glassEffect(.regular, in: .capsule)
        }
        .scenePadding(.horizontal)
        .padding(.vertical)
        .onAppear {
            isFocused = false
        }
    }

    private func performSend() {
        guard canSend else { return }
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        isFocused = false
        let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        text = ""
        onSend(trimmedText, nil)
    }
}

// MARK: - Composer Actions Sheet

struct ComposerActionsSheet: View {
    let quickActions: [ChatQuickAction]
    let onQuickAction: (ChatQuickAction) -> Void
    let onPhotosSelected: ([Data]) -> Void

    @State private var selectedItems: [PhotosPickerItem] = []
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            RoundedRectangle(cornerRadius: 2.5)
                .fill(Color.white.opacity(0.3))
                .frame(width: 36, height: 5)
                .padding(.top, 8)
                .padding(.bottom, 14)

            Text("Add to chat")
                .font(.headline)
                .padding(.bottom, 16)

            HStack(spacing: 12) {
                PhotosPicker(
                    selection: $selectedItems,
                    maxSelectionCount: 3,
                    matching: .images
                ) {
                    VStack(spacing: 6) {
                        Image(systemName: "photo.on.rectangle")
                            .font(.title3)
                        Text("Photos")
                            .font(.caption)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 72)
                    .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
                .onChange(of: selectedItems) { _, newItems in
                    Task { await loadAndReturn(items: newItems) }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)

            ForEach(Array(quickActions.enumerated()), id: \.element.id) { index, action in
                if index > 0 {
                    Divider().padding(.leading, 52)
                }

                Button {
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    dismiss()
                    onQuickAction(action)
                } label: {
                    HStack(spacing: 14) {
                        Image(systemName: action.icon)
                            .font(.body)
                            .frame(width: 28)
                        Text(action.title)
                            .font(.body)
                        Spacer()
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 13)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }

            Spacer()
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.hidden)
        .presentationBackground(.ultraThinMaterial)
    }

    private func loadAndReturn(items: [PhotosPickerItem]) async {
        var loaded: [Data] = []
        for item in items {
            guard let data = try? await item.loadTransferable(type: Data.self) else { continue }
            if let compressed = compressImage(data, maxDimension: 1024, quality: 0.72) {
                loaded.append(compressed)
            } else {
                loaded.append(data)
            }
        }
        guard !loaded.isEmpty else { return }
        dismiss()
        onPhotosSelected(loaded)
    }

    private func compressImage(_ data: Data, maxDimension: CGFloat, quality: CGFloat) -> Data? {
        guard let image = UIImage(data: data) else { return nil }
        let sourceSize = image.size
        let scale = min(maxDimension / max(sourceSize.width, sourceSize.height), 1)
        let targetSize = CGSize(width: sourceSize.width * scale, height: sourceSize.height * scale)
        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }
        return resized.jpegData(compressionQuality: quality)
    }
}
