"use client";

import { Footprints, Leaf, Moon } from "lucide-react";

export function DailyHabitWidget({ data }: { data: Record<string, unknown> }) {
  if (data.error) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-xs text-red-400">
        {String(data.error)}
      </div>
    );
  }

  const logged = data.logged as Record<string, unknown> | undefined;
  if (!logged) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 space-y-2">
      <p className="text-xs font-medium text-zinc-400">Logged</p>
      <div className="flex gap-4">
        {logged.steps_actual != null && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Footprints size={12} className="text-zinc-500" />
            {Number(logged.steps_actual).toLocaleString()} steps
          </div>
        )}
        {logged.nutrition_on_plan != null && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Leaf size={12} className="text-zinc-500" />
            {logged.nutrition_on_plan ? "On plan" : "Off plan"}
          </div>
        )}
        {logged.sleep_hours != null && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Moon size={12} className="text-zinc-500" />
            {Number(logged.sleep_hours)}h sleep
          </div>
        )}
      </div>
    </div>
  );
}
