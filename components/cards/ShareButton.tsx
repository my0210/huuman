"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";
import type { SocialMessageType } from "@/lib/types";

type CardType = Extract<
  SocialMessageType,
  "session_card" | "sleep_card" | "meal_card" | "commitment_card"
>;

export function ShareButton({
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

  if (status === "shared") {
    return (
      <div className="flex items-center gap-1.5 px-4 py-2 text-xs text-emerald-400">
        <Check size={12} />
        Shared
      </div>
    );
  }

  return (
    <button
      onClick={handleShare}
      disabled={status === "sharing"}
      className="flex items-center gap-1.5 px-4 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
    >
      <Share2 size={12} />
      {status === "sharing"
        ? "Sharing\u2026"
        : status === "error"
          ? "Retry share"
          : "Share to groups"}
    </button>
  );
}
