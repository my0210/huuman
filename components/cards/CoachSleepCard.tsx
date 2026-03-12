"use client";

import { SleepCardContent } from "./SleepCardContent";
import { ShareButton } from "./ShareButton";
import type { SleepCardDetail } from "@/lib/types";

function extractDetail(
  data: Record<string, unknown>,
): SleepCardDetail | null {
  const hours = (data.sleepHours ?? data.hours) as number | undefined;
  if (hours == null) return null;

  return {
    hours,
    quality: (data.sleepQuality ?? data.quality) as
      | SleepCardDetail["quality"],
    streak: (data.streak ?? data.sleepStreak) as number | undefined,
    isNotable: data.isNotable as boolean | undefined,
  };
}

export function CoachSleepCard({
  data,
}: {
  data: Record<string, unknown>;
}) {
  if (data.error) {
    return (
      <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 text-xs text-text-muted">
        Couldn&apos;t log sleep. Try again in a moment.
      </div>
    );
  }

  const detail = extractDetail(data);
  if (!detail) return null;

  return (
    <div>
      <SleepCardContent detail={detail} />
      <ShareButton type="sleep_card" detail={detail} />
    </div>
  );
}
