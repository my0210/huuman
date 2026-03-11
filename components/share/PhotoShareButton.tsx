"use client";

import { useEffect, useState } from "react";
import { Check, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { haptics } from "@/lib/haptics";
import {
  fetchImageAsFile,
  sanitizeFilename,
  shareFileOrDownload,
} from "@/lib/share/files";

export function PhotoShareButton({
  imageUrl,
  filename = "huuman-photo.jpg",
  label = "Share photo",
  shareText = "Shared from huuman",
  className = "",
}: {
  imageUrl: string;
  filename?: string;
  label?: string;
  shareText?: string;
  className?: string;
}) {
  const [status, setStatus] = useState<
    "idle" | "sharing" | "shared" | "downloaded" | "error"
  >("idle");

  useEffect(() => {
    if (status !== "shared" && status !== "downloaded") return;
    const timeout = window.setTimeout(() => setStatus("idle"), 2500);
    return () => window.clearTimeout(timeout);
  }, [status]);

  async function handleShare() {
    setStatus("sharing");
    try {
      const file = await fetchImageAsFile(
        imageUrl,
        sanitizeFilename(filename || "huuman-photo.jpg"),
      );
      const outcome = await shareFileOrDownload({
        file,
        title: "huuman",
        text: shareText,
      });

      if (outcome === "cancelled") {
        setStatus("idle");
        return;
      }

      if (outcome === "downloaded") {
        setStatus("downloaded");
        toast.success("Photo downloaded. You can send it in WhatsApp manually.");
        return;
      }

      haptics.success();
      setStatus("shared");
    } catch {
      setStatus("error");
      toast.error("Couldn't prepare the photo for sharing.");
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      onClick={handleShare}
      disabled={status === "sharing"}
      className={`gap-2 ${className}`}
    >
      {status === "shared" ? (
        <Check size={14} />
      ) : status === "downloaded" ? (
        <Download size={14} />
      ) : (
        <Share2 size={14} />
      )}
      {status === "sharing"
        ? "Preparing..."
        : status === "shared"
          ? "Shared"
          : status === "downloaded"
            ? "Downloaded"
            : status === "error"
              ? "Retry share"
              : label}
    </Button>
  );
}
