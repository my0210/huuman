"use client";

import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

export type ShareFileOutcome = "shared" | "downloaded" | "cancelled";

interface ShareFileOptions {
  file: File;
  title?: string;
  text?: string;
  downloadName?: string;
}

export function sanitizeFilename(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "huuman-share";
}

export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, {
    type: blob.type || "image/png",
    lastModified: Date.now(),
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export async function fetchImageAsFile(url: string, filename: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${res.status}`);
  }

  const blob = await res.blob();
  return blobToFile(blob, filename);
}

async function shareViaCapacitor(file: File, title?: string, text?: string): Promise<ShareFileOutcome> {
  const dataUrl = await blobToDataUrl(file);
  const result = await Share.share({
    title,
    text,
    files: [dataUrl],
    dialogTitle: title,
  });
  if (result.activityType === undefined && !result.activityType) {
    return "shared";
  }
  return "shared";
}

export async function shareFileOrDownload({
  file,
  title,
  text,
  downloadName = file.name,
}: ShareFileOptions): Promise<ShareFileOutcome> {
  // Native Capacitor share -- reliable on iOS, uses system share sheet
  if (Capacitor.isNativePlatform()) {
    try {
      return await shareViaCapacitor(file, title, text);
    } catch (error) {
      if (error instanceof Error && error.message?.includes("cancel")) {
        return "cancelled";
      }
      throw error;
    }
  }

  // Web Share API
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  try {
    if (typeof nav.share === "function") {
      const data: ShareData = { title, text, files: [file] };
      if (!nav.canShare || nav.canShare(data)) {
        await nav.share(data);
        return "shared";
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled";
    }
    throw error;
  }

  downloadBlob(file, downloadName);
  return "downloaded";
}
