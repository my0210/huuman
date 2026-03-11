"use client";

import { Moon } from "lucide-react";
import type { SleepCardDetail } from "@/lib/types";

const QUALITY_LABEL: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "OK",
  4: "Good",
  5: "Great",
};

export function SleepCardContent({ detail }: { detail: SleepCardDetail }) {
  return (
    <div className="rounded-radius-lg border border-[var(--phase-border)] bg-[var(--phase-glass)] backdrop-blur-xl shadow-lg overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 shadow-[0_0_10px_rgba(167,139,250,0.2)]">
          <Moon size={14} className="text-violet-400" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold leading-tight text-text-primary font-mono tracking-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            {detail.hours}h
          </p>
          {detail.quality != null && (
            <p className="mt-0.5 text-xs text-text-muted">
              Quality:{" "}
              <span className="text-text-secondary">
                {QUALITY_LABEL[detail.quality] ?? detail.quality}
              </span>
            </p>
          )}
        </div>

        {detail.streak != null && detail.streak > 0 && (
          <span className="whitespace-nowrap rounded-full border border-violet-400/30 bg-violet-400/10 px-2 py-0.5 text-[10px] font-bold text-violet-400 backdrop-blur-md">
            {detail.streak}d streak
          </span>
        )}
      </div>
    </div>
  );
}
