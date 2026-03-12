"use client";

import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export interface CapturedPhoto {
  file: File;
  previewUrl: string;
}

/**
 * Uses native camera on Capacitor, falls back to file input on web.
 * Returns null if the user cancelled.
 */
export async function pickPhoto(
  source: "camera" | "photos" | "prompt" = "prompt",
): Promise<CapturedPhoto | null> {
  if (!Capacitor.isNativePlatform()) {
    return pickViaFileInput();
  }

  const sourceMap: Record<string, CameraSource> = {
    camera: CameraSource.Camera,
    photos: CameraSource.Photos,
    prompt: CameraSource.Prompt,
  };

  try {
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: sourceMap[source],
      width: 2048,
      height: 2048,
    });

    if (!photo.webPath) return null;

    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    const ext = photo.format === "png" ? "png" : "jpeg";
    const file = new File([blob], `photo.${ext}`, {
      type: `image/${ext}`,
      lastModified: Date.now(),
    });

    return {
      file,
      previewUrl: photo.webPath,
    };
  } catch {
    return null;
  }
}

/**
 * Pick multiple photos via native camera. Falls back to multi-file input on web.
 */
export async function pickPhotos(): Promise<CapturedPhoto[]> {
  if (!Capacitor.isNativePlatform()) {
    return pickMultipleViaFileInput();
  }

  try {
    const result = await Camera.pickImages({
      quality: 85,
      width: 2048,
      height: 2048,
    });

    const photos: CapturedPhoto[] = [];
    for (const photo of result.photos) {
      if (!photo.webPath) continue;
      const response = await fetch(photo.webPath);
      const blob = await response.blob();
      const ext = photo.format === "png" ? "png" : "jpeg";
      const file = new File([blob], `photo.${ext}`, {
        type: `image/${ext}`,
        lastModified: Date.now(),
      });
      photos.push({ file, previewUrl: photo.webPath });
    }
    return photos;
  } catch {
    return [];
  }
}

function pickViaFileInput(): Promise<CapturedPhoto | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file || !file.type.startsWith("image/")) {
        resolve(null);
        return;
      }
      resolve({ file, previewUrl: URL.createObjectURL(file) });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function pickMultipleViaFileInput(): Promise<CapturedPhoto[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = () => {
      const files = input.files;
      if (!files) {
        resolve([]);
        return;
      }
      const photos: CapturedPhoto[] = Array.from(files)
        .filter((f) => f.type.startsWith("image/"))
        .map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
      resolve(photos);
    };
    input.oncancel = () => resolve([]);
    input.click();
  });
}
