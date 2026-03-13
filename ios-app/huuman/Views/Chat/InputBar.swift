import PhotosUI
import SwiftUI
import UIKit

struct ChatQuickAction: Identifiable {
    let id: String
    let title: String
    let message: String
    let icon: String
}

struct ChatComposerBar: View {
    let onSend: (String, [Data]?) -> Void
    let onToggleQuickActions: () -> Void
    let isQuickActionsVisible: Bool
    let isLoading: Bool

    @State private var text = ""
    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var selectedImages: [Data] = []
    @FocusState private var isFocused: Bool

    private var canSend: Bool {
        (!text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !selectedImages.isEmpty) && !isLoading
    }

    var body: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Color.chatHairline)
                .frame(height: 1 / UIScreen.main.scale)

            if !selectedImages.isEmpty {
                attachmentStrip
                    .frame(maxWidth: 760)
                    .frame(maxWidth: .infinity)
            }

            HStack(alignment: .bottom, spacing: 8) {
                toggleButton
                inputField
                sendButton
            }
            .padding(.horizontal, 12)
            .padding(.top, 10)
            .padding(.bottom, 8)
            .frame(maxWidth: 760)
            .frame(maxWidth: .infinity)
        }
    }

    private var attachmentStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(Array(selectedImages.enumerated()), id: \.offset) { index, imageData in
                    ComposerAttachmentThumbnail(imageData: imageData) {
                        withAnimation(.easeOut(duration: 0.18)) {
                            selectedImages.remove(at: index)
                        }
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 10)
            .padding(.bottom, 4)
        }
    }

    private var toggleButton: some View {
        Button(action: onToggleQuickActions) {
            Image(systemName: isQuickActionsVisible ? "xmark" : "plus")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Color.chatPrimaryText)
                .frame(width: AppLayout.inputButtonSize, height: AppLayout.inputButtonSize)
                .background(Color.white.opacity(0.06), in: Circle())
                .overlay(
                    Circle()
                        .stroke(Color.chatCardBorder, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .frame(minWidth: AppLayout.buttonMinHeight, minHeight: AppLayout.buttonMinHeight)
        .accessibilityLabel(isQuickActionsVisible ? "Hide quick actions" : "Show quick actions")
    }

    private var inputField: some View {
        HStack(alignment: .bottom, spacing: 4) {
            TextField("Message huuman...", text: $text, axis: .vertical)
                .lineLimit(1...6)
                .font(.system(size: 17))
                .foregroundStyle(Color.chatPrimaryText)
                .tint(Color.chatAccent)
                .focused($isFocused)
                .padding(.leading, 14)
                .padding(.vertical, 11)
                .onSubmit {
                    if canSend {
                        performSend()
                    }
                }

            PhotosPicker(
                selection: $selectedItems,
                maxSelectionCount: 3,
                matching: .images
            ) {
                Image(systemName: "camera")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Color.chatSecondaryText)
                    .frame(width: AppLayout.buttonMinHeight, height: AppLayout.buttonMinHeight)
            }
            .buttonStyle(.plain)
            .disabled(isLoading)
            .accessibilityLabel("Attach photo")
            .padding(.trailing, 2)
            .onChange(of: selectedItems) { _, newItems in
                Task { await loadImages(from: newItems) }
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color.chatComposerField)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(Color.chatCardBorder, lineWidth: 1)
        )
    }

    private var sendButton: some View {
        Button(action: performSend) {
            Image(systemName: "arrow.up")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(canSend ? Color.white : Color.chatTertiaryText)
                .frame(width: AppLayout.inputButtonSize, height: AppLayout.inputButtonSize)
                .background(
                    canSend ? Color.chatAccent : Color.white.opacity(0.08),
                    in: Circle()
                )
        }
        .buttonStyle(.plain)
        .frame(minWidth: AppLayout.buttonMinHeight, minHeight: AppLayout.buttonMinHeight)
        .disabled(!canSend)
        .accessibilityLabel("Send message")
        .animation(.easeOut(duration: 0.15), value: canSend)
    }

    private func performSend() {
        guard canSend else { return }

        isFocused = false

        let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let images = selectedImages.isEmpty ? nil : selectedImages

        text = ""
        selectedImages = []
        selectedItems = []

        onSend(trimmedText, images)
    }

    private func loadImages(from items: [PhotosPickerItem]) async {
        var loadedImages: [Data] = []

        for item in items {
            guard let data = try? await item.loadTransferable(type: Data.self) else { continue }

            if let compressed = compressImage(data, maxDimension: 1024, quality: 0.72) {
                loadedImages.append(compressed)
            } else {
                loadedImages.append(data)
            }
        }

        selectedImages = loadedImages
    }

    private func compressImage(_ data: Data, maxDimension: CGFloat, quality: CGFloat) -> Data? {
        guard let image = UIImage(data: data) else { return nil }

        let sourceSize = image.size
        let scale = min(maxDimension / max(sourceSize.width, sourceSize.height), 1)
        let targetSize = CGSize(width: sourceSize.width * scale, height: sourceSize.height * scale)

        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let resizedImage = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }

        return resizedImage.jpegData(compressionQuality: quality)
    }
}

struct QuickActionRow: View {
    let actions: [ChatQuickAction]
    let onSelect: (ChatQuickAction) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(actions) { action in
                    Button {
                        onSelect(action)
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: action.icon)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(Color.chatSecondaryText)

                            Text(action.title)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(Color.chatPrimaryText)
                                .lineLimit(1)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(Color.white.opacity(0.06))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .stroke(Color.chatCardBorder, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 10)
            .padding(.bottom, 2)
        }
    }
}

private struct ComposerAttachmentThumbnail: View {
    let imageData: Data
    let onRemove: () -> Void

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Group {
                if let image = UIImage(data: imageData) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                } else {
                    Color.white.opacity(0.08)
                }
            }
            .frame(width: 68, height: 68)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Color.chatCardBorder, lineWidth: 1)
            )

            Button(action: onRemove) {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(Color.chatPrimaryText)
                    .frame(width: 20, height: 20)
                    .background(Color.black.opacity(0.75), in: Circle())
            }
            .buttonStyle(.plain)
            .frame(minWidth: 28, minHeight: 28)
            .offset(x: 6, y: -6)
            .accessibilityLabel("Remove photo")
        }
    }
}
