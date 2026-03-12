"use client";

import { MealCardContent } from "./MealCardContent";
import type { MealCardDetail } from "@/lib/types";

function extractDetail(data: Record<string, unknown>): MealCardDetail {
  return {
    photoUrl: data.photoUrl as string | undefined,
    calories: data.calories as number | undefined,
    proteinG: data.proteinG as number | undefined,
    assessment: (data.assessment ?? data.oneLine) as string | undefined,
    oneLine: data.oneLine as string | undefined,
  };
}

export function CoachMealCard({
  data,
}: {
  data: Record<string, unknown>;
}) {
  if (data.error) {
    return (
      <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 text-xs text-text-muted">
        Couldn&apos;t log meal. Try again in a moment.
      </div>
    );
  }

  const detail = extractDetail(data);

  return <MealCardContent detail={detail} />;
}
