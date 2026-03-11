"use client";

import { useEffect, useState } from "react";
import { Check, Download, Share2 } from "lucide-react";
import type { SessionCardDetail, SleepCardDetail } from "@/lib/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { haptics } from "@/lib/haptics";
import { blobToFile, sanitizeFilename, shareFileOrDownload } from "@/lib/share/files";
import { renderShareCardToBlob } from "@/lib/share/render";
import { SessionShareImage } from "@/components/share/SessionShareImage";
import { SleepShareImage } from "@/components/share/SleepShareImage";

interface WeekProgressItem {
  domain: string;
  label: string;
  completed: number;
  total: number;
}

export function ShareButton({
  type,
  detail,
  weekProgress,
}:
  | {
      type: "session_card";
      detail: SessionCardDetail;
      weekProgress?: WeekProgressItem[];
    }
  | {
      type: "sleep_card";
      detail: SleepCardDetail;
      weekProgress?: never;
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
      const blob = await renderShareCardToBlob({
        element:
          type === "session_card" ? (
            <SessionShareImage detail={detail} weekProgress={weekProgress} />
          ) : (
            <SleepShareImage detail={detail} />
          ),
      });

      const file = blobToFile(
        blob,
        `${sanitizeFilename(
          type === "session_card"
            ? `huuman-${detail.title}`
            : `huuman-sleep-${detail.hours}h`,
        )}.png`,
      );

      const outcome = await shareFileOrDownload({
        file,
        title: "huuman",
        text:
          type === "session_card"
            ? `${detail.title} completed in huuman`
            : `${detail.hours}h sleep logged in huuman`,
      });

      if (outcome === "cancelled") {
        setStatus("idle");
        return;
      }

      if (outcome === "downloaded") {
        setStatus("downloaded");
        toast.success("Image downloaded. You can send it in WhatsApp manually.");
        return;
      }

      haptics.success();
      setStatus("shared");
    } catch {
      setStatus("error");
      toast.error("Couldn't prepare the share image.");
    }
  }

  return (
    <div className="px-4 pb-3">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={handleShare}
        disabled={status === "sharing"}
        className={`w-full justify-center gap-2 ${
          status === "shared"
            ? "border-semantic-success/30 text-semantic-success"
            : status === "downloaded"
              ? "border-border-strong text-text-primary"
              : ""
        }`}
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
                : "Share"}
      </Button>
    </div>
  );
}
