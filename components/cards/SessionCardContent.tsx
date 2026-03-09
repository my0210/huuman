"use client";

import { Check } from "lucide-react";
import type { SessionCardDetail, SessionDomain } from "@/lib/types";

const DOMAIN_STYLE: Record<
  SessionDomain,
  { text: string; border: string; bg: string; dot: string; short: string }
> = {
  cardio: {
    text: "text-red-400",
    border: "border-red-400/30",
    bg: "bg-red-400/10",
    dot: "bg-red-400",
    short: "CARDIO",
  },
  strength: {
    text: "text-orange-400",
    border: "border-orange-400/30",
    bg: "bg-orange-400/10",
    dot: "bg-orange-400",
    short: "STR",
  },
  mindfulness: {
    text: "text-cyan-400",
    border: "border-cyan-400/30",
    bg: "bg-cyan-400/10",
    dot: "bg-cyan-400",
    short: "MIND",
  },
};

interface Props {
  detail: SessionCardDetail;
  weekProgress?: {
    domain: string;
    label: string;
    completed: number;
    total: number;
  }[];
}

export function SessionCardContent({ detail, weekProgress }: Props) {
  const c = DOMAIN_STYLE[detail.domain];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className={`h-2 w-2 rounded-full ${c.dot}`} />
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
          <Check size={10} className="text-emerald-400" />
        </div>
        <p className="text-sm font-semibold text-zinc-200 flex-1 truncate">
          {detail.title}
        </p>
        <span
          className={`text-[10px] font-bold ${c.text} ${c.bg} ${c.border} border rounded px-1.5 py-0.5`}
        >
          {c.short}
        </span>
        {detail.isExtra && (
          <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">
            Extra
          </span>
        )}
      </div>

      <div className="px-4 pb-3">
        {detail.domain === "strength" &&
          detail.exercises &&
          detail.exercises.length > 0 && (
            <div className="space-y-1">
              {detail.exercises.map((ex, i) => (
                <p key={i} className="text-xs text-zinc-400">
                  {ex.name}{" "}
                  <span className="text-zinc-300">
                    {ex.sets}&times;{ex.reps}
                    {ex.weight && ` @ ${ex.weight}`}
                  </span>
                </p>
              ))}
            </div>
          )}

        {detail.domain === "cardio" && (
          <div className="flex gap-4 text-xs text-zinc-400">
            {detail.durationMinutes != null && (
              <span>{detail.durationMinutes} min</span>
            )}
            {detail.zone != null && <span>Zone {detail.zone}</span>}
            {detail.avgHr != null && <span>Avg {detail.avgHr} bpm</span>}
          </div>
        )}

        {detail.domain === "mindfulness" && (
          <div className="flex gap-4 text-xs text-zinc-400">
            {detail.mindfulnessType && (
              <span className="capitalize">{detail.mindfulnessType}</span>
            )}
            {detail.durationMinutes != null && (
              <span>{detail.durationMinutes} min</span>
            )}
          </div>
        )}
      </div>

      {weekProgress && weekProgress.length > 0 && (
        <div className="flex gap-3 border-t border-zinc-800/50 px-4 py-2">
          {weekProgress
            .filter((d) => d.total > 0)
            .map((d) => (
              <div key={d.domain} className="text-xs text-zinc-500">
                {d.label}:{" "}
                <span className="text-zinc-300">
                  {d.completed}/{d.total}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
