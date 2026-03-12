"use client";

import { Footprints, Leaf, Moon } from "lucide-react";

export function DailyHabitWidget({ data }: { data: Record<string, unknown> }) {
  if (data.error) {
    return (
      <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 text-xs text-text-muted">
        Couldn&apos;t log that right now. Try again in a moment.
      </div>
    );
  }

  const logged = data.logged as Record<string, unknown> | undefined;
  if (!logged) return null;

  return (
    <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 space-y-2">
      <p className="text-xs font-medium text-text-muted">Logged</p>
      <div className="flex gap-4">
        {logged.steps_actual != null && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Footprints size={12} className="text-text-muted" />
            {Number(logged.steps_actual).toLocaleString()} steps
          </div>
        )}
        {logged.nutrition_on_plan != null && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Leaf size={12} className="text-text-muted" />
            {logged.nutrition_on_plan ? "On plan" : "Off plan"}
          </div>
        )}
        {logged.sleep_hours != null && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Moon size={12} className="text-text-muted" />
            {Number(logged.sleep_hours)}h sleep
          </div>
        )}
      </div>
    </div>
  );
}
