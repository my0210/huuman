"use client";

import { Moon } from "lucide-react";
import type { SleepCardDetail } from "@/lib/types";
import { domainStyle } from "@/lib/domain-colors";

const ds = domainStyle.sleep;

const QUALITY_LABEL: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "OK",
  4: "Good",
  5: "Great",
};

export function SleepCardContent({ detail }: { detail: SleepCardDetail }) {
  return (
    <div className="rounded-radius-lg border border-border-default bg-surface-raised overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-radius-sm ${ds.bg}`}>
          <Moon size={14} className={ds.text} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold leading-tight text-text-primary">
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
          <span className={`whitespace-nowrap rounded-full border ${ds.border} ${ds.bg} px-2 py-0.5 text-xs font-bold ${ds.text}`}>
            {detail.streak}d streak
          </span>
        )}
      </div>
    </div>
  );
}
