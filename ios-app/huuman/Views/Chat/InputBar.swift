import PhotosUI
import SwiftUI
import UIKit

struct ChatQuickAction: Identifiable {
    let id: String
    let title: String
    let message: String
    let icon: String
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
        HStack(alignment: .bottom, spacing: 6) {
            Button(action: onPlusTap) {
                Image(systemName: "plus")
            }
            .buttonStyle(.glass)
            .accessibilityLabel("Attachments and actions")

            HStack(alignment: .bottom, spacing: 0) {
                TextField("Message huuman...", text: $text, axis: .vertical)
                    .lineLimit(1...6)
                    .font(.system(size: 17))
                    .tint(Color.chatAccent)
                    .focused($isFocused)
                    .padding(.leading, 14)
                    .padding(.vertical, 9)
                    .onSubmit {
                        if canSend { performSend() }
                    }

                Button(action: performSend) {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(canSend ? Color.white : Color.chatTertiaryText)
                        .frame(width: 28, height: 28)
                        .background(
                            canSend ? Color.chatAccent : Color.white.opacity(0.06),
                            in: Circle()
                        )
                }
                .buttonStyle(.plain)
                .disabled(!canSend)
                .accessibilityLabel("Send message")
                .animation(.easeOut(duration: 0.15), value: canSend)
                .padding(.trailing, 4)
                .padding(.bottom, 4)
            }
            .glassEffect(in: .capsule)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
    }

    private func performSend() {
        guard canSend else { return }
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
        NavigationStack {
            List {
                Section {
                    PhotosPicker(
                        selection: $selectedItems,
                        maxSelectionCount: 3,
                        matching: .images
                    ) {
                        Label("Photos", systemImage: "photo.on.rectangle")
                    }
                    .onChange(of: selectedItems) { _, newItems in
                        Task { await loadAndReturn(items: newItems) }
                    }
                }

                Section("Quick actions") {
                    ForEach(quickActions) { action in
                        Button {
                            dismiss()
                            onQuickAction(action)
                        } label: {
                            Label(action.title, systemImage: action.icon)
                        }
                    }
                }
            }
            .navigationTitle("Attachments")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.visible)
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
