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
    <div className="rounded-radius-lg border border-border-default bg-surface-raised overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className={`h-2 w-2 rounded-full ${c.dot} shadow-[0_0_8px_${c.dot.replace('bg-', '')}]`} />
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
          <Check size={10} className="text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-text-primary flex-1 truncate">
          {detail.title}
        </p>
        <span
          className={`text-[10px] font-bold ${c.text} ${c.bg} ${c.border} border rounded px-1.5 py-0.5`}
        >
          {c.short}
        </span>
        {detail.isExtra && (
          <span className="text-[10px] font-medium text-text-muted bg-surface-elevated rounded px-1.5 py-0.5">
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
                <p key={i} className="text-xs text-text-secondary">
                  {ex.name}{" "}
                  <span className="text-text-primary font-mono">
                    {ex.sets}&times;{ex.reps}
                    {ex.weight && ` @ ${ex.weight}`}
                  </span>
                </p>
              ))}
            </div>
          )}

        {detail.domain === "cardio" && (
          <div className="flex gap-4 text-xs text-text-secondary">
            {detail.durationMinutes != null && (
              <span className="font-mono text-text-primary">{detail.durationMinutes} min</span>
            )}
            {detail.zone != null && <span>Zone {detail.zone}</span>}
            {detail.avgHr != null && <span className="font-mono">Avg {detail.avgHr} bpm</span>}
          </div>
        )}

        {detail.domain === "mindfulness" && (
          <div className="flex gap-4 text-xs text-text-secondary">
            {detail.mindfulnessType && (
              <span className="capitalize">{detail.mindfulnessType}</span>
            )}
            {detail.durationMinutes != null && (
              <span className="font-mono text-text-primary">{detail.durationMinutes} min</span>
            )}
          </div>
        )}
      </div>

      {weekProgress && weekProgress.length > 0 && (
        <div className="flex gap-3 border-t border-border-subtle px-4 py-2">
          {weekProgress
            .filter((d) => d.total > 0)
            .map((d) => (
              <div key={d.domain} className="text-xs text-text-muted">
                {d.label}:{" "}
                <span className="text-text-secondary font-mono">
                  {d.completed}/{d.total}
                </span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
