"use client";

import { Clock } from "lucide-react";
import type { CommitmentCardDetail, Domain } from "@/lib/types";

const DOMAIN_STYLE: Record<Domain, { text: string; bg: string }> = {
  cardio: { text: "text-red-400", bg: "bg-red-400/10" },
  strength: { text: "text-orange-400", bg: "bg-orange-400/10" },
  mindfulness: { text: "text-cyan-400", bg: "bg-cyan-400/10" },
  nutrition: { text: "text-green-400", bg: "bg-green-400/10" },
  sleep: { text: "text-violet-400", bg: "bg-violet-400/10" },
};

export function CommitmentCardContent({
  detail,
}: {
  detail: CommitmentCardDetail;
}) {
  const c = DOMAIN_STYLE[detail.domain] ?? DOMAIN_STYLE.strength;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${c.bg}`}
        >
          <Clock size={14} className={c.text} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-200">{detail.title}</p>
          {(detail.time || detail.place) && (
            <p className="mt-0.5 text-xs text-zinc-400">
              {[detail.time, detail.place].filter(Boolean).join(" · ")}
            </p>
          )}
          {detail.sessionPreview && (
            <p className="mt-1 text-xs italic text-zinc-500">
              {detail.sessionPreview}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
