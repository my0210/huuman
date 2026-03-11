"use client";

import Image from "next/image";
import { Utensils } from "lucide-react";
import type { MealCardDetail } from "@/lib/types";

export function MealCardContent({ detail }: { detail: MealCardDetail }) {
  return (
    <div className="rounded-radius-lg border border-[var(--phase-border)] bg-[var(--phase-glass)] backdrop-blur-xl shadow-lg overflow-hidden">
      {detail.photoUrl && (
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={detail.photoUrl}
            alt="Meal"
            fill
            className="object-cover opacity-90 hover:opacity-100 transition-opacity"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-400/10 shadow-[0_0_10px_rgba(74,222,128,0.2)]">
          <Utensils size={14} className="text-green-400" />
        </div>

        <div className="min-w-0 flex-1">
          {(detail.calories != null || detail.proteinG != null) && (
            <p className="text-sm font-semibold text-text-primary font-mono tracking-tight">
              {detail.calories != null && `~${detail.calories} cal`}
              {detail.calories != null && detail.proteinG != null && " · "}
              {detail.proteinG != null && `${detail.proteinG}g protein`}
            </p>
          )}
          {(detail.assessment || detail.oneLine) && (
            <p className="mt-0.5 text-xs text-text-secondary">
              {detail.assessment ?? detail.oneLine}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
