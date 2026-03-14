import Photos
import PhotosUI
import SwiftUI
import UIKit

struct ChatQuickAction: Identifiable {
    let id: String
    let title: String
    let message: String
    let icon: String
}

struct PendingImage: Identifiable {
    let id: UUID
    let thumbnail: UIImage
    let data: Data
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
    @Binding var pendingImages: [PendingImage]

    @State private var text = ""
    @FocusState private var isFocused: Bool

    private var canSend: Bool {
        (!text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !pendingImages.isEmpty) && !isLoading
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            Button(action: onPlusTap) {
                Image(systemName: "plus")
                    .imageScale(.large)
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.glass)
            .buttonBorderShape(.circle)
            .accessibilityLabel("Attachments and actions")

            VStack(alignment: .leading, spacing: 0) {
                if !pendingImages.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(pendingImages) { pending in
                                PendingImageThumbnail(image: pending.thumbnail) {
                                    withAnimation(.easeOut(duration: 0.15)) {
                                        pendingImages.removeAll { $0.id == pending.id }
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 12)
                        .padding(.top, 10)
                        .padding(.bottom, 4)
                    }
                }

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
                        ZStack {
                            Capsule()
                                .fill(canSend ? Color.chatAccent : Color.white.opacity(0.06))
                                .frame(width: 36, height: 34)
                            Image(systemName: "arrow.up")
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(canSend ? Color.white : Color.chatTertiaryText)
                        }
                    }
                    .buttonStyle(PressableButtonStyle())
                    .disabled(!canSend)
                    .accessibilityLabel("Send message")
                    .animation(.easeOut(duration: 0.15), value: canSend)
                    .frame(minWidth: AppLayout.buttonMinHeight, minHeight: AppLayout.buttonMinHeight)
                }
            }
            .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: AppLayout.composerRadius, style: .continuous))
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
        let images: [Data]? = pendingImages.isEmpty ? nil : pendingImages.map(\.data)
        text = ""
        pendingImages = []
        onSend(trimmedText, images)
    }
}

// MARK: - Pending Image Thumbnail

private struct PendingImageThumbnail: View {
    let image: UIImage
    let onRemove: () -> Void

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Image(uiImage: image)
                .resizable()
                .aspectRatio(contentMode: .fill)
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            Button(action: onRemove) {
                Image(systemName: "xmark")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 20, height: 20)
                    .background(Color.black.opacity(0.6), in: Circle())
            }
            .buttonStyle(.plain)
            .offset(x: 4, y: -4)
        }
    }
}

// MARK: - Composer Actions Sheet

struct ComposerActionsSheet: View {
    let quickActions: [ChatQuickAction]
    let onQuickAction: (ChatQuickAction) -> Void
    let onPhotosSelected: ([PendingImage]) -> Void

    @State private var provider = RecentPhotosProvider()
    @State private var selectedIdentifiers: Set<String> = []
    @State private var showCamera = false
    @State private var isLoadingFullRes = false
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var capturedFromCamera: [PendingImage] = []
    @Environment(\.dismiss) private var dismiss

    private static let maxSelection = 10

    private var hasCameraHardware: Bool {
        UIImagePickerController.isSourceTypeAvailable(.camera)
    }

    private static func makeThumbnail(from data: Data) -> UIImage {
        guard let full = UIImage(data: data),
              let small = RecentPhotosProvider.compressImage(full, maxDimension: 120, quality: 0.6) else {
            return UIImage()
        }
        return UIImage(data: small) ?? UIImage()
    }

    var body: some View {
        VStack(spacing: 0) {
            RoundedRectangle(cornerRadius: 2.5)
                .fill(Color.white.opacity(0.3))
                .frame(width: 36, height: 5)
                .padding(.top, 8)
                .padding(.bottom, 20)

            Text("Add to chat")
                .font(.headline)
                .padding(.bottom, 16)

            if provider.authorizationStatus == .authorized || provider.authorizationStatus == .limited || !provider.photos.isEmpty {
                recentPhotosStrip
                    .padding(.bottom, 12)
            }

            if !selectedIdentifiers.isEmpty {
                attachButton
                    .padding(.horizontal, 20)
                    .padding(.bottom, 12)
            }

            browseAllRow
                .padding(.horizontal, 20)
                .padding(.bottom, 16)

            Divider()
                .padding(.horizontal, 20)
                .padding(.bottom, 4)

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
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.hidden)
        .presentationBackground(.ultraThinMaterial)
        .task {
            await provider.requestAccessAndLoad()
        }
        .fullScreenCover(isPresented: $showCamera, onDismiss: {
            guard !capturedFromCamera.isEmpty else { return }
            let pending = capturedFromCamera
            capturedFromCamera = []
            dismiss()
            onPhotosSelected(pending)
        }) {
            CameraView { capturedData in
                let thumb = Self.makeThumbnail(from: capturedData)
                capturedFromCamera = [PendingImage(id: UUID(), thumbnail: thumb, data: capturedData)]
            }
            .ignoresSafeArea()
        }
    }

    // MARK: - Recent Photos Strip

    private var recentPhotosStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: 6) {
                if hasCameraHardware {
                    cameraTile
                }

                ForEach(provider.photos) { photo in
                    recentPhotoTile(photo)
                }
            }
            .padding(.horizontal, 20)
        }
        .frame(height: 80)
    }

    private var cameraTile: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            showCamera = true
        } label: {
            VStack(spacing: 6) {
                Image(systemName: "camera.fill")
                    .font(.title3)
                    .foregroundStyle(Color.chatSecondaryText)
                Text("Camera")
                    .font(.caption2)
                    .foregroundStyle(Color.chatTertiaryText)
            }
            .frame(width: 80, height: 80)
            .background(Color.white.opacity(0.10), in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private func recentPhotoTile(_ photo: RecentPhoto) -> some View {
        let isSelected = selectedIdentifiers.contains(photo.id)
        return Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            if isSelected {
                selectedIdentifiers.remove(photo.id)
            } else if selectedIdentifiers.count < Self.maxSelection {
                selectedIdentifiers.insert(photo.id)
            }
        } label: {
            ZStack(alignment: .topTrailing) {
                Group {
                    if let thumb = photo.thumbnail {
                        Image(uiImage: thumb)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } else {
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(Color.white.opacity(0.08))
                            .overlay {
                                Image(systemName: "photo")
                                    .font(.caption)
                                    .foregroundStyle(Color.white.opacity(0.15))
                            }
                    }
                }
                .frame(width: 80, height: 80)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 22))
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(.white, Color.chatAccent)
                        .padding(4)
                }
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: - Attach Button

    private var attachButton: some View {
        Button {
            guard !isLoadingFullRes else { return }
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            isLoadingFullRes = true
            Task {
                let imageDataArray = await provider.loadFullResolution(for: selectedIdentifiers)
                let pending = imageDataArray.map { data in
                    PendingImage(id: UUID(), thumbnail: Self.makeThumbnail(from: data), data: data)
                }
                isLoadingFullRes = false
                guard !pending.isEmpty else { return }
                dismiss()
                onPhotosSelected(pending)
            }
        } label: {
            HStack(spacing: 8) {
                if isLoadingFullRes {
                    ProgressView()
                        .tint(.white)
                        .controlSize(.small)
                } else {
                    Image(systemName: "paperclip")
                        .font(.subheadline.weight(.semibold))
                }
                Text("Attach \(selectedIdentifiers.count) photo\(selectedIdentifiers.count == 1 ? "" : "s")")
                    .font(.subheadline.weight(.semibold))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(Color.chatAccent, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .buttonStyle(.plain)
        .disabled(isLoadingFullRes)
    }

    // MARK: - Browse All

    private var browseAllRow: some View {
        PhotosPicker(
            selection: $pickerItems,
            maxSelectionCount: 10,
            matching: .images
        ) {
            HStack(spacing: 12) {
                Image(systemName: "photo.on.rectangle.angled")
                    .font(.body)
                    .frame(width: 28)
                Text("Browse All Photos")
                    .font(.body)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(Color.chatTertiaryText)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 13)
            .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onChange(of: pickerItems) { _, newItems in
            Task { await loadPickerItems(newItems) }
        }
    }

    private func loadPickerItems(_ items: [PhotosPickerItem]) async {
        var pending: [PendingImage] = []
        for item in items {
            guard let data = try? await item.loadTransferable(type: Data.self) else { continue }
            let compressed = compressImage(data, maxDimension: 1024, quality: 0.72) ?? data
            pending.append(PendingImage(id: UUID(), thumbnail: Self.makeThumbnail(from: compressed), data: compressed))
        }
        guard !pending.isEmpty else { return }
        dismiss()
        onPhotosSelected(pending)
    }

    private func compressImage(_ data: Data, maxDimension: CGFloat, quality: CGFloat) -> Data? {
        guard let image = UIImage(data: data) else { return nil }
        return RecentPhotosProvider.compressImage(image, maxDimension: maxDimension, quality: quality)
    }
}
