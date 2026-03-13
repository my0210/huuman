import SwiftUI
import PhotosUI

struct ProgressPhoto: Identifiable {
    let id: String
    let imageUrl: String
    let analysis: String?
    let notes: String?
    let capturedAt: String
    let createdAt: String?
}

@Observable
@MainActor
final class ProgressPhotosViewModel {
    var photos: [ProgressPhoto] = []
    var loading = true
    var uploading = false

    func load() async {
        do {
            let data = try await APIClient.shared.get("/api/progress-photos")
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
               let arr = json["photos"] as? [[String: Any]] {
                photos = arr.compactMap { dict in
                    guard let id = dict["id"] as? String,
                          let url = dict["imageUrl"] as? String,
                          let capturedAt = dict["capturedAt"] as? String else { return nil }
                    return ProgressPhoto(
                        id: id,
                        imageUrl: url,
                        analysis: dict["analysis"] as? String,
                        notes: dict["notes"] as? String,
                        capturedAt: capturedAt,
                        createdAt: dict["createdAt"] as? String
                    )
                }
            }
        } catch {
            // Silent
        }
        loading = false
    }

    func deletePhoto(_ id: String) async {
        do {
            _ = try await APIClient.shared.delete("/api/progress-photos", body: ["id": id])
            photos.removeAll { $0.id == id }
        } catch {
            // Silent
        }
    }
}

struct ProgressPhotosView: View {
    @State private var vm = ProgressPhotosViewModel()
    @State private var selectedPhoto: ProgressPhoto?
    @State private var showPicker = false
    @State private var pickerItem: PhotosPickerItem?

    private let columns = [
        GridItem(.flexible(), spacing: 4),
        GridItem(.flexible(), spacing: 4),
        GridItem(.flexible(), spacing: 4),
    ]

    var body: some View {
        Group {
            if vm.loading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if vm.photos.isEmpty && !vm.uploading {
                ContentUnavailableView {
                    Label("No progress photos", systemImage: "camera")
                } description: {
                    Text("Photos detected in chat are saved here automatically")
                }
            } else {
                ScrollView {
                    LazyVGrid(columns: columns, spacing: 4) {
                        ForEach(vm.photos) { photo in
                            AsyncImage(url: URL(string: photo.imageUrl)) { phase in
                                switch phase {
                                case .success(let image):
                                    image
                                        .resizable()
                                        .scaledToFill()
                                case .failure:
                                    Color.surfaceRaised
                                        .overlay {
                                            Image(systemName: "photo")
                                                .foregroundStyle(Color.textMuted)
                                        }
                                default:
                                    Color.surfaceRaised
                                        .overlay { ProgressView().tint(Color.textMuted) }
                                }
                            }
                            .frame(minHeight: 120)
                            .clipShape(RoundedRectangle(cornerRadius: 4))
                            .contentShape(Rectangle())
                            .onTapGesture {
                                selectedPhoto = photo
                            }
                        }
                    }
                    .padding(.horizontal, 4)
                    .padding(.top, 4)
                }
            }
        }
        .background(Color.surfaceBase)
        .navigationTitle("Progress Photos")
        .navigationBarTitleDisplayMode(.inline)
        .task { await vm.load() }
        .sheet(item: $selectedPhoto) { photo in
            ProgressPhotoDetail(photo: photo) {
                Task { await vm.deletePhoto(photo.id) }
                selectedPhoto = nil
            }
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
            .presentationBackground(Color.surfaceOverlay)
        }
    }
}

private struct ProgressPhotoDetail: View {
    let photo: ProgressPhoto
    let onDelete: () -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var showDeleteConfirm = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    AsyncImage(url: URL(string: photo.imageUrl)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFit()
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        default:
                            Color.surfaceRaised
                                .frame(height: 300)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .overlay { ProgressView().tint(Color.textMuted) }
                        }
                    }

                    HStack {
                        Image(systemName: "calendar")
                            .foregroundStyle(Color.textTertiary)
                        Text(formatDate(photo.capturedAt))
                            .font(.subheadline)
                            .foregroundStyle(Color.textSecondary)
                    }

                    if let analysis = photo.analysis, !analysis.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Analysis")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundStyle(Color.textTertiary)

                            Text(analysis)
                                .font(.subheadline)
                                .foregroundStyle(Color.textSecondary)
                                .lineSpacing(4)
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.surfaceRaised)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
                .padding(16)
            }
            .background(Color.surfaceBase)
            .navigationTitle("Photo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(Color.textSecondary)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showDeleteConfirm = true
                    } label: {
                        Image(systemName: "trash")
                            .foregroundStyle(Color.semanticError)
                    }
                }
            }
            .alert("Delete photo?", isPresented: $showDeleteConfirm) {
                Button("Delete", role: .destructive) { onDelete() }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This cannot be undone.")
            }
        }
    }

    private func formatDate(_ iso: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withFullDate]
        guard let date = formatter.date(from: iso) else { return iso }
        let display = DateFormatter()
        display.dateStyle = .medium
        return display.string(from: date)
    }
}
