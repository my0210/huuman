"use client";

import Image from "next/image";
import { Utensils } from "lucide-react";
import type { MealCardDetail } from "@/lib/types";
import { domainStyle } from "@/lib/domain-colors";

const ds = domainStyle.nutrition;

export function MealCardContent({ detail }: { detail: MealCardDetail }) {
  return (
    <div className="rounded-radius-lg border border-border-default bg-surface-raised overflow-hidden">
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
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-radius-sm ${ds.bg}`}>
          <Utensils size={14} className={ds.text} />
        </div>

        <div className="min-w-0 flex-1">
          {(detail.calories != null || detail.proteinG != null) && (
            <p className="text-sm font-semibold text-text-primary">
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
