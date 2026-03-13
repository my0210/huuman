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
        VStack(spacing: 6) {
            if !selectedImages.isEmpty {
                attachmentStrip
            }

            HStack(alignment: .bottom, spacing: 6) {
                toggleButton
                composerCapsule
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 4)
        }
        .padding(.top, 6)
    }

    private var attachmentStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(selectedImages.indices, id: \.self) { i in
                    ComposerAttachmentThumbnail(imageData: selectedImages[i]) {
                        withAnimation(.easeOut(duration: 0.18)) {
                            _ = selectedImages.remove(at: i)
                        }
                    }
                }
            }
            .padding(.horizontal, 12)
        }
    }

    private var toggleButton: some View {
        Button(action: onToggleQuickActions) {
            Image(systemName: isQuickActionsVisible ? "xmark" : "plus")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Color.chatSecondaryText)
                .frame(width: 34, height: 34)
                .background(Color.white.opacity(0.06), in: Circle())
        }
        .buttonStyle(.plain)
        .frame(minWidth: AppLayout.buttonMinHeight, minHeight: AppLayout.buttonMinHeight)
        .accessibilityLabel(isQuickActionsVisible ? "Hide quick actions" : "Show quick actions")
    }

    private var composerCapsule: some View {
        HStack(alignment: .bottom, spacing: 0) {
            TextField("Message huuman...", text: $text, axis: .vertical)
                .lineLimit(1...6)
                .font(.system(size: 17))
                .foregroundStyle(Color.chatPrimaryText)
                .tint(Color.chatAccent)
                .focused($isFocused)
                .padding(.leading, 16)
                .padding(.vertical, 10)
                .onSubmit {
                    if canSend { performSend() }
                }

            PhotosPicker(
                selection: $selectedItems,
                maxSelectionCount: 3,
                matching: .images
            ) {
                Image(systemName: "camera")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Color.chatSecondaryText)
                    .frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)
            .disabled(isLoading)
            .accessibilityLabel("Attach photo")
            .onChange(of: selectedItems) { _, newItems in
                Task { await loadImages(from: newItems) }
            }

            Button(action: performSend) {
                Image(systemName: "arrow.up")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(canSend ? Color.white : Color.chatTertiaryText)
                    .frame(width: 30, height: 30)
                    .background(
                        canSend ? Color.chatAccent : Color.white.opacity(0.06),
                        in: Circle()
                    )
            }
            .buttonStyle(.plain)
            .disabled(!canSend)
            .accessibilityLabel("Send message")
            .animation(.easeOut(duration: 0.15), value: canSend)
            .padding(.trailing, 5)
            .padding(.bottom, 4)
        }
        .background(
            Capsule(style: .continuous)
                .fill(Color.chatComposerField)
        )
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
            HStack(spacing: 8) {
                ForEach(actions) { action in
                    Button {
                        onSelect(action)
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: action.icon)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Color.chatSecondaryText)

                            Text(action.title)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Color.chatPrimaryText)
                                .lineLimit(1)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(
                            Capsule(style: .continuous)
                                .fill(Color.chatComposerField)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 12)
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
            .frame(width: 60, height: 60)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            Button(action: onRemove) {
                Image(systemName: "xmark")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(Color.chatPrimaryText)
                    .frame(width: 18, height: 18)
                    .background(Color.black.opacity(0.7), in: Circle())
            }
            .buttonStyle(.plain)
            .frame(minWidth: 28, minHeight: 28)
            .offset(x: 5, y: -5)
            .accessibilityLabel("Remove photo")
        }
    }
}
