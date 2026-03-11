"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import type { SocialMessageType } from "@/lib/types";
import { Button } from "@/components/ui/Button";

type CardType = Extract<
  SocialMessageType,
  "session_card" | "sleep_card" | "meal_card" | "commitment_card"
>;

export function GroupShareButton({
  type,
  detail,
}: {
  type: CardType;
  detail: object;
}) {
  const [status, setStatus] = useState<
    "idle" | "sharing" | "shared" | "error"
  >("idle");

  async function handleShare() {
    setStatus("sharing");
    try {
      const res = await fetch("/api/social/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, detail }),
      });
      if (!res.ok) throw new Error();
      setStatus("shared");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="px-4 pb-3">
      <Button
        type="button"
        size="sm"
        variant={status === "shared" ? "ghost" : "secondary"}
        onClick={handleShare}
        disabled={status === "sharing" || status === "shared"}
        className={`w-full justify-center gap-2 ${
          status === "shared" ? "text-semantic-success" : ""
        }`}
      >
        {status === "shared" ? <Check size={14} /> : <Share2 size={14} />}
        {status === "sharing"
          ? "Sharing..."
          : status === "shared"
            ? "Shared to groups"
            : status === "error"
              ? "Retry group share"
              : "Share to groups"}
      </Button>
    </div>
  );
}
