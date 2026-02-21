"use client";

import { Flame, Beef } from "lucide-react";

interface NutritionData {
  calorieTarget?: number;
  proteinTargetG?: number;
  guidelines?: string[];
  mealIdeas?: string[];
}

export function NutritionDetail({ detail }: { detail: Record<string, unknown> }) {
  const d = detail as unknown as NutritionData;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {d.calorieTarget && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Flame size={12} className="text-orange-400" />
            {d.calorieTarget} kcal
          </div>
        )}
        {d.proteinTargetG && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Beef size={12} className="text-red-400" />
            {d.proteinTargetG}g protein
          </div>
        )}
      </div>

      {d.guidelines && d.guidelines.length > 0 && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">Guidelines</p>
          <ul className="space-y-0.5">
            {d.guidelines.map((g, i) => (
              <li key={i} className="text-xs text-zinc-400 flex gap-1.5">
                <span className="text-zinc-600">•</span> {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {d.mealIdeas && d.mealIdeas.length > 0 && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">Meal ideas</p>
          <ul className="space-y-0.5">
            {d.mealIdeas.map((m, i) => (
              <li key={i} className="text-xs text-zinc-400 flex gap-1.5">
                <span className="text-green-600">•</span> {m}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
