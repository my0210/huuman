import Photos
import UIKit

struct RecentPhoto: Identifiable {
    let id: String
    let asset: PHAsset
    var thumbnail: UIImage?
}

@Observable
@MainActor
final class RecentPhotosProvider {
    var photos: [RecentPhoto] = []
    var authorizationStatus: PHAuthorizationStatus = PHPhotoLibrary.authorizationStatus(for: .readWrite)

    private let imageManager = PHCachingImageManager()
    private let thumbnailSize = CGSize(width: 200, height: 200)

    func loadIfAuthorized() {
        let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        authorizationStatus = status
        guard status == .authorized || status == .limited else { return }
        loadRecentPhotos()
    }

    func requestAccessAndLoad() async {
        let status = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
        authorizationStatus = status
        guard status == .authorized || status == .limited else { return }
        loadRecentPhotos()
    }

    func reloadPhotos() {
        guard authorizationStatus == .authorized || authorizationStatus == .limited else { return }
        loadRecentPhotos()
    }

    func loadFullResolution(for identifiers: Set<String>) async -> [(identifier: String, data: Data)] {
        let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: Array(identifiers), options: nil)
        var results: [(identifier: String, data: Data)] = []

        let options = PHImageRequestOptions()
        options.deliveryMode = .highQualityFormat
        options.isSynchronous = false
        options.isNetworkAccessAllowed = true

        for i in 0..<fetchResult.count {
            let asset = fetchResult.object(at: i)
            if let data = await loadImageData(for: asset, options: options) {
                results.append((identifier: asset.localIdentifier, data: data))
            }
        }
        return results
    }

    private func loadRecentPhotos() {
        let options = PHFetchOptions()
        options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        options.fetchLimit = 20

        let fetchResult = PHAsset.fetchAssets(with: .image, options: options)
        var assets: [PHAsset] = []
        fetchResult.enumerateObjects { asset, _, _ in
            assets.append(asset)
        }

        imageManager.startCachingImages(
            for: assets,
            targetSize: thumbnailSize,
            contentMode: .aspectFill,
            options: nil
        )

        photos = assets.map { RecentPhoto(id: $0.localIdentifier, asset: $0) }

        for (index, asset) in assets.enumerated() {
            loadThumbnail(for: asset, at: index)
        }
    }

    private func loadThumbnail(for asset: PHAsset, at index: Int) {
        let options = PHImageRequestOptions()
        options.deliveryMode = .fastFormat
        options.isNetworkAccessAllowed = true

        imageManager.requestImage(
            for: asset,
            targetSize: thumbnailSize,
            contentMode: .aspectFill,
            options: options
        ) { [weak self] image, _ in
            Task { @MainActor in
                guard let self, index < self.photos.count else { return }
                self.photos[index].thumbnail = image
            }
        }
    }

    private func loadImageData(for asset: PHAsset, options: PHImageRequestOptions) async -> Data? {
        await withCheckedContinuation { continuation in
            imageManager.requestImage(
                for: asset,
                targetSize: CGSize(width: 2048, height: 2048),
                contentMode: .aspectFit,
                options: options
            ) { image, info in
                let isDegraded = (info?[PHImageResultIsDegradedKey] as? Bool) ?? false
                guard !isDegraded else { return }

                guard let image else {
                    continuation.resume(returning: nil)
                    return
                }
                let compressed = Self.compressImage(image, maxDimension: 1024, quality: 0.72)
                continuation.resume(returning: compressed)
            }
        }
    }

    static func compressImage(_ image: UIImage, maxDimension: CGFloat, quality: CGFloat) -> Data? {
        let size = image.size
        let scale = min(maxDimension / max(size.width, size.height), 1)
        let targetSize = CGSize(width: size.width * scale, height: size.height * scale)
        let renderer = UIGraphicsImageRenderer(size: targetSize)
        let resized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }
        return resized.jpegData(compressionQuality: quality)
    }
}
