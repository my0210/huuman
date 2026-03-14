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
    let assetIdentifier: String?

    init(id: UUID = UUID(), thumbnail: UIImage, data: Data, assetIdentifier: String? = nil) {
        self.id = id
        self.thumbnail = thumbnail
        self.data = data
        self.assetIdentifier = assetIdentifier
    }
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
    let provider: RecentPhotosProvider
    let pendingAssetIdentifiers: Set<String>
    let quickActions: [ChatQuickAction]
    let onQuickAction: (ChatQuickAction) -> Void
    let onPhotosSelected: ([PendingImage]) -> Void

    @State private var selectedIdentifiers: Set<String>
    @State private var showCamera = false
    @State private var isLoadingFullRes = false
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var capturedFromCamera: [PendingImage] = []
    @State private var showLimitedPicker = false
    @Environment(\.dismiss) private var dismiss

    private static let maxSelection = 10

    init(
        provider: RecentPhotosProvider,
        pendingAssetIdentifiers: Set<String>,
        quickActions: [ChatQuickAction],
        onQuickAction: @escaping (ChatQuickAction) -> Void,
        onPhotosSelected: @escaping ([PendingImage]) -> Void
    ) {
        self.provider = provider
        self.pendingAssetIdentifiers = pendingAssetIdentifiers
        self.quickActions = quickActions
        self.onQuickAction = onQuickAction
        self.onPhotosSelected = onPhotosSelected
        _selectedIdentifiers = State(initialValue: pendingAssetIdentifiers)
    }

    private var hasCameraHardware: Bool {
        UIImagePickerController.isSourceTypeAvailable(.camera)
    }

    private var showPhotoStrip: Bool {
        provider.authorizationStatus == .authorized || provider.authorizationStatus == .limited || !provider.photos.isEmpty
    }

    private var newSelectionCount: Int {
        selectedIdentifiers.subtracting(pendingAssetIdentifiers).count
    }

    private static func makeThumbnail(from data: Data) -> UIImage {
        guard let full = UIImage(data: data),
              let small = RecentPhotosProvider.compressImage(full, maxDimension: 120, quality: 0.6) else {
            return UIImage()
        }
        return UIImage(data: small) ?? UIImage()
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    if showPhotoStrip {
                        recentPhotosStrip
                    }

                    if provider.authorizationStatus == .limited {
                        limitedAccessRow
                            .padding(.horizontal, 20)
                            .padding(.vertical, 8)
                    }

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
                }
            }
            .scrollBounceBehavior(.basedOnSize)
            .navigationTitle("Add to chat")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if newSelectionCount > 0 {
                        if isLoadingFullRes {
                            ProgressView()
                                .controlSize(.small)
                        } else {
                            Button {
                                performAdd()
                            } label: {
                                Text("Add (\(newSelectionCount))")
                                    .fontWeight(.semibold)
                                    .foregroundStyle(.white)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(Color.chatAccent)
                        }
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .presentationBackground(.ultraThinMaterial)
        .task {
            if provider.photos.isEmpty {
                await provider.requestAccessAndLoad()
            }
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
        .background {
            if showLimitedPicker {
                LimitedLibraryPickerPresenter(isPresented: $showLimitedPicker) {
                    provider.reloadPhotos()
                }
            }
        }
    }

    // MARK: - Limited Access Row

    private var limitedAccessRow: some View {
        HStack(spacing: 6) {
            Image(systemName: "exclamationmark.circle")
                .font(.caption)
                .foregroundStyle(Color.chatTertiaryText)
            Text("Limited Photo Access")
                .font(.caption)
                .foregroundStyle(Color.chatTertiaryText)
            Spacer()
            Button {
                showLimitedPicker = true
            } label: {
                Text("Manage")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(Color.chatAccent)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Photo Strip

    private var recentPhotosStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: 8) {
                if hasCameraHardware {
                    cameraTile
                }

                photosTile

                ForEach(provider.photos.filter { $0.thumbnail != nil }) { photo in
                    recentPhotoTile(photo)
                }
            }
            .padding(.horizontal, 20)
        }
        .frame(height: 100)
    }

    private var cameraTile: some View {
        Button {
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            showCamera = true
        } label: {
            actionTileLabel(icon: "camera.fill", title: "Camera")
        }
        .buttonStyle(.plain)
    }

    private var photosTile: some View {
        PhotosPicker(
            selection: $pickerItems,
            maxSelectionCount: Self.maxSelection,
            matching: .images
        ) {
            actionTileLabel(icon: "photo.on.rectangle", title: "Photos")
        }
        .buttonStyle(.plain)
        .onChange(of: pickerItems) { _, newItems in
            Task { await loadPickerItems(newItems) }
        }
    }

    private func actionTileLabel(icon: String, title: String) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(Color.chatSecondaryText)
            Text(title)
                .font(.caption)
                .foregroundStyle(Color.chatTertiaryText)
        }
        .frame(width: 100, height: 100)
        .background(Color.white.opacity(0.10), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }

    private func recentPhotoTile(_ photo: RecentPhoto) -> some View {
        let isSelected = selectedIdentifiers.contains(photo.id)
        let isPending = pendingAssetIdentifiers.contains(photo.id)
        return Button {
            guard !isPending else { return }
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            if isSelected {
                selectedIdentifiers.remove(photo.id)
            } else if selectedIdentifiers.count < Self.maxSelection {
                selectedIdentifiers.insert(photo.id)
            }
        } label: {
            ZStack(alignment: .topTrailing) {
                Image(uiImage: photo.thumbnail ?? UIImage())
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 100, height: 100)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(.white, Color.chatAccent)
                        .shadow(color: .black.opacity(0.3), radius: 2, y: 1)
                        .padding(4)
                } else {
                    Circle()
                        .stroke(Color.white.opacity(0.6), lineWidth: 1.5)
                        .frame(width: 24, height: 24)
                        .shadow(color: .black.opacity(0.3), radius: 2, y: 1)
                        .padding(4)
                }
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: - Add Photos Action

    private func performAdd() {
        guard !isLoadingFullRes else { return }
        let newIdentifiers = selectedIdentifiers.subtracting(pendingAssetIdentifiers)
        guard !newIdentifiers.isEmpty else { return }

        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        isLoadingFullRes = true
        Task {
            let results = await provider.loadFullResolution(for: newIdentifiers)
            let pending = results.map { result in
                PendingImage(
                    thumbnail: Self.makeThumbnail(from: result.data),
                    data: result.data,
                    assetIdentifier: result.identifier
                )
            }
            isLoadingFullRes = false
            guard !pending.isEmpty else { return }
            dismiss()
            onPhotosSelected(pending)
        }
    }

    // MARK: - PhotosPicker Loading

    private func loadPickerItems(_ items: [PhotosPickerItem]) async {
        var pending: [PendingImage] = []
        for item in items {
            guard let data = try? await item.loadTransferable(type: Data.self) else { continue }
            let compressed = compressImage(data, maxDimension: 1024, quality: 0.72) ?? data
            pending.append(PendingImage(thumbnail: Self.makeThumbnail(from: compressed), data: compressed))
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

// MARK: - Limited Library Picker Presenter

private struct LimitedLibraryPickerPresenter: UIViewControllerRepresentable {
    @Binding var isPresented: Bool
    let onDismiss: () -> Void

    func makeUIViewController(context: Context) -> UIViewController {
        let controller = UIViewController()
        controller.view.backgroundColor = .clear
        return controller
    }

    func updateUIViewController(_ controller: UIViewController, context: Context) {
        guard isPresented, !context.coordinator.isPresenting else { return }
        context.coordinator.isPresenting = true

        DispatchQueue.main.async {
            PHPhotoLibrary.shared().presentLimitedLibraryPicker(from: controller) { _ in
                isPresented = false
                context.coordinator.isPresenting = false
                onDismiss()
            }
        }
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    final class Coordinator {
        var isPresenting = false
    }
}
