"use client";

import { Flame, Beef } from "lucide-react";

export function NutritionDetail({ detail }: { detail: Record<string, unknown> }) {
  const calories = extractCalories(detail);
  const protein = extractProtein(detail);
  const guidelines = toStringArray(detail.guidelines);
  const mealIdeas = extractMealIdeas(detail.mealIdeas);

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {calories && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Flame size={12} className="text-orange-400" />
            {calories}
          </div>
        )}
        {protein && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Beef size={12} className="text-red-400" />
            {protein}
          </div>
        )}
      </div>

      {guidelines.length > 0 && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">Guidelines</p>
          <ul className="space-y-0.5">
            {guidelines.map((g, i) => (
              <li key={i} className="text-xs text-zinc-400 flex gap-1.5">
                <span className="text-zinc-600">•</span> {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mealIdeas.length > 0 && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">Meal ideas</p>
          <ul className="space-y-0.5">
            {mealIdeas.map((m, i) => (
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

function extractCalories(d: Record<string, unknown>): string | null {
  const raw = d.calorieTarget ?? d.dailyCalories ?? d.calories;
  if (!raw) return null;
  if (typeof raw === 'number') return `${raw} kcal`;
  return String(raw);
}

function extractProtein(d: Record<string, unknown>): string | null {
  const raw = d.proteinTargetG ?? d.proteinTarget ?? d.protein;
  if (!raw) return null;
  if (typeof raw === 'number') return `${raw}g protein`;
  return String(raw);
}

function toStringArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') return val.split(/[.!]\s+/).filter(Boolean);
  return [];
}

function extractMealIdeas(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'object' && val !== null) {
    return Object.entries(val as Record<string, unknown>).map(
      ([meal, desc]) => `${capitalize(meal)}: ${desc}`,
    );
  }
  if (typeof val === 'string') return [val];
  return [];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/([A-Z])/g, ' $1').trim();
}
