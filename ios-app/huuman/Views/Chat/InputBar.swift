import SwiftUI
import PhotosUI

struct InputBar: View {
    let onSend: (String, [Data]?) -> Void
    let onToggleMenu: () -> Void
    let isMenuOpen: Bool
    let isLoading: Bool

    @State private var text = ""
    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var selectedImages: [Data] = []
    @State private var sendTap = false
    @State private var menuTap = false
    @FocusState private var isFocused: Bool

    private var canSend: Bool {
        (!text.trimmingCharacters(in: .whitespaces).isEmpty || !selectedImages.isEmpty) && !isLoading
    }

    var body: some View {
        VStack(spacing: 0) {
            Divider().overlay(Color.borderSubtle)

            if !selectedImages.isEmpty {
                imageStrip
            }

            HStack(alignment: .bottom, spacing: 8) {
                menuButton
                textFieldPill
                sendButton
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
        .background(Color.surfaceBase)
    }

    // MARK: - Image Strip

    private var imageStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Array(selectedImages.enumerated()), id: \.offset) { index, imageData in
                    ZStack(alignment: .topTrailing) {
                        if let uiImage = UIImage(data: imageData) {
                            Image(uiImage: uiImage)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 64, height: 64)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }

                        Button {
                            withAnimation(.easeOut(duration: 0.15)) {
                                selectedImages.remove(at: index)
                            }
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.title3)
                                .foregroundStyle(Color.textPrimary)
                                .background(Circle().fill(Color.surfaceBase))
                        }
                        .offset(x: 6, y: -6)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
    }

    // MARK: - Menu Button

    private var menuButton: some View {
        Button {
            menuTap.toggle()
            onToggleMenu()
        } label: {
            Image(systemName: isMenuOpen ? "xmark" : "plus")
                .font(.body.weight(.medium))
                .contentTransition(.symbolEffect(.replace))
                .foregroundStyle(Color.textSecondary)
                .frame(width: AppLayout.inputButtonSize, height: AppLayout.inputButtonSize)
                .background(Color.surfaceElevated, in: Circle())
        }
        .frame(minWidth: AppLayout.buttonMinHeight, minHeight: AppLayout.buttonMinHeight)
        .sensoryFeedback(.impact(weight: .light), trigger: menuTap)
    }

    // MARK: - Text Field Pill

    private var textFieldPill: some View {
        HStack(alignment: .bottom, spacing: 0) {
            TextField("Message huuman...", text: $text, axis: .vertical)
                .lineLimit(1...5)
                .font(.subheadline)
                .foregroundStyle(Color.textPrimary)
                .focused($isFocused)
                .padding(.horizontal, 12)
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
                    .font(.body)
                    .foregroundStyle(Color.textMuted)
                    .frame(minWidth: AppLayout.buttonMinHeight, minHeight: AppLayout.buttonMinHeight)
            }
            .disabled(isLoading)
            .padding(.trailing, 2)
            .onChange(of: selectedItems) { _, newItems in
                Task { await loadImages(newItems) }
            }
        }
        .background(Color.surfaceRaised, in: RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(Color.borderDefault))
    }

    // MARK: - Send Button

    private var sendButton: some View {
        Button {
            sendTap.toggle()
            performSend()
        } label: {
            Image(systemName: "arrow.up")
                .font(.body.weight(.bold))
                .foregroundStyle(canSend ? Color.surfaceBase : Color.textMuted)
                .frame(width: AppLayout.inputButtonSize, height: AppLayout.inputButtonSize)
                .background(canSend ? Color.textPrimary : Color.surfaceElevated, in: Circle())
        }
        .frame(minWidth: AppLayout.buttonMinHeight, minHeight: AppLayout.buttonMinHeight)
        .disabled(!canSend)
        .animation(.easeOut(duration: 0.15), value: canSend)
        .sensoryFeedback(.impact(weight: .light), trigger: sendTap)
    }

    // MARK: - Actions

    private func performSend() {
        guard canSend else { return }
        let message = text.trimmingCharacters(in: .whitespaces)
        let images = selectedImages.isEmpty ? nil : selectedImages
        text = ""
        selectedImages = []
        selectedItems = []
        onSend(message, images)
    }

    private func loadImages(_ items: [PhotosPickerItem]) async {
        var loaded: [Data] = []
        for item in items {
            if let data = try? await item.loadTransferable(type: Data.self) {
                if let compressed = compressImage(data, maxDimension: 1024, quality: 0.7) {
                    loaded.append(compressed)
                } else {
                    loaded.append(data)
                }
            }
        }
        selectedImages = loaded
    }

    private func compressImage(_ data: Data, maxDimension: CGFloat, quality: CGFloat) -> Data? {
        guard let uiImage = UIImage(data: data) else { return nil }
        let size = uiImage.size
        let scale = min(maxDimension / max(size.width, size.height), 1.0)
        let newSize = CGSize(width: size.width * scale, height: size.height * scale)

        let renderer = UIGraphicsImageRenderer(size: newSize)
        let resized = renderer.image { _ in
            uiImage.draw(in: CGRect(origin: .zero, size: newSize))
        }
        return resized.jpegData(compressionQuality: quality)
    }
}
