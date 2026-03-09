"use client";

import Image from "next/image";
import { Utensils } from "lucide-react";
import type { MealCardDetail } from "@/lib/types";

export function MealCardContent({ detail }: { detail: MealCardDetail }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {detail.photoUrl && (
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={detail.photoUrl}
            alt="Meal"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-400/10">
          <Utensils size={14} className="text-green-400" />
        </div>

        <div className="min-w-0 flex-1">
          {(detail.calories != null || detail.proteinG != null) && (
            <p className="text-sm font-semibold text-zinc-200">
              {detail.calories != null && `~${detail.calories} cal`}
              {detail.calories != null && detail.proteinG != null && " · "}
              {detail.proteinG != null && `${detail.proteinG}g protein`}
            </p>
          )}
          {(detail.assessment || detail.oneLine) && (
            <p className="mt-0.5 text-xs text-zinc-400">
              {detail.assessment ?? detail.oneLine}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
