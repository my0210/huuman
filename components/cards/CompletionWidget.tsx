"use client";

import { Check } from "lucide-react";

interface CompletionData {
  session: {
    id: string;
    domain: string;
    title: string;
    status: string;
  };
  weekProgress: {
    domain: string;
    label: string;
    completed: number;
    total: number;
    completionRate: number;
  }[];
  isExtra?: boolean;
}

export function CompletionWidget({ data }: { data: Record<string, unknown> }) {
  if (data.error) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-xs text-red-400">
        {String(data.error)}
      </div>
    );
  }

  const { session, weekProgress, isExtra } = data as unknown as CompletionData;

  return (
    <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
          <Check size={12} className="text-emerald-400" />
        </div>
        <div className="flex items-center gap-2">
          <div>
            <p className="text-sm font-medium text-emerald-300">{isExtra ? 'Logged' : 'Done!'}</p>
            <p className="text-xs text-zinc-400">{session?.title}</p>
          </div>
          {isExtra && (
            <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800 rounded px-1.5 py-0.5">
              Extra
            </span>
          )}
        </div>
      </div>

      {weekProgress && (
        <div className="flex gap-3 px-4 pb-3">
          {weekProgress.filter(d => d.total > 0).map((d) => (
            <div key={d.domain} className="text-xs text-zinc-500">
              {d.label}: <span className="text-zinc-300">{d.completed}/{d.total}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
