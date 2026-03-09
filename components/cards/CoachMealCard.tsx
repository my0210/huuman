"use client";

import { MealCardContent } from "./MealCardContent";
import { ShareButton } from "./ShareButton";
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
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-400">
        Couldn&apos;t log meal. Try again in a moment.
      </div>
    );
  }

  const detail = extractDetail(data);

  return (
    <div>
      <MealCardContent detail={detail} />
      <ShareButton type="meal_card" detail={detail} />
    </div>
  );
}
