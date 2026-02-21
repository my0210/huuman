"use client";

import { Moon, Clock, ListChecks } from "lucide-react";

interface SleepData {
  targetHours?: number;
  bedtimeWindow?: string;
  wakeWindow?: string;
  windDownRoutine?: string[];
}

export function SleepDetail({ detail }: { detail: Record<string, unknown> }) {
  const d = detail as unknown as SleepData;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {d.targetHours && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Moon size={12} className="text-violet-400" />
            {d.targetHours}h target
          </div>
        )}
        {d.bedtimeWindow && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Clock size={12} className="text-zinc-500" />
            Bed: {d.bedtimeWindow}
          </div>
        )}
        {d.wakeWindow && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-300">
            <Clock size={12} className="text-zinc-500" />
            Wake: {d.wakeWindow}
          </div>
        )}
      </div>

      {d.windDownRoutine && d.windDownRoutine.length > 0 && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1">
            <ListChecks size={10} /> Wind-down routine
          </p>
          <ul className="space-y-0.5">
            {d.windDownRoutine.map((step, i) => (
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
