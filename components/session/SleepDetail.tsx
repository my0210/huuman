"use client";

import { Moon, Clock, ListChecks } from "lucide-react";

export function SleepDetail({ detail }: { detail: Record<string, unknown> }) {
  const targetHours = extractTargetHours(detail);
  const bedtime = String(detail.bedtimeWindow ?? detail.bedtime ?? "");
  const wake = String(detail.wakeWindow ?? detail.wake ?? "");
  const routine = extractRoutine(detail.windDownRoutine ?? detail.routine);
  const environment = detail.environment ? String(detail.environment) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {targetHours && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Moon size={12} className="text-violet-400" />
            {targetHours}
          </div>
        )}
        {bedtime && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Clock size={12} className="text-zinc-500" />
            Bed: {bedtime}
          </div>
        )}
        {wake && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Clock size={12} className="text-zinc-500" />
            Wake: {wake}
          </div>
        )}
      </div>

      {environment && (
        <p className="text-xs text-zinc-400">{environment}</p>
      )}

      {routine.length > 0 && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
            <ListChecks size={10} /> Wind-down routine
          </p>
          <ul className="space-y-0.5">
            {routine.map((step, i) => (
              <li key={i} className="text-xs text-zinc-400 flex gap-1.5">
                <span className="text-violet-600">{i + 1}.</span> {step}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function extractTargetHours(d: Record<string, unknown>): string | null {
  const raw = d.targetHours;
  if (!raw) return null;
  if (typeof raw === 'number') return `${raw}h target`;
  return String(raw).includes('h') ? String(raw) : `${raw} target`;
}

function extractRoutine(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') {
    const steps = val.split(/(?:\d{1,2}:\d{2}\s*(?:AM|PM)?:\s*)/i).filter(Boolean);
    if (steps.length > 1) return steps.map((s) => s.trim().replace(/\.\s*$/, ''));
    return val.split(/[.]\s+/).filter(Boolean);
  }
  return [];
}
