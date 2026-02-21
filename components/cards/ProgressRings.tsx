"use client";

import { DOMAIN_META, Domain } from "@/lib/types";

interface DomainProgress {
  domain: string;
  label: string;
  total: number;
  completed: number;
  completionRate: number;
}

interface ProgressData {
  weekStart: string;
  progress: DomainProgress[];
  steps: { date: string; steps: number; target: number }[];
}

export function ProgressRings({ data }: { data: Record<string, unknown> }) {
  const { progress, steps } = data as unknown as ProgressData;

  const totalSteps = steps.reduce((s, d) => s + d.steps, 0);
  const avgSteps = steps.length > 0 ? Math.round(totalSteps / steps.length) : 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800/50">
        <p className="text-sm font-semibold text-zinc-200">This Week</p>
      </div>

      <div className="grid grid-cols-5 gap-1 px-4 py-4">
        {progress.map((d) => (
          <DomainRing key={d.domain} domain={d} />
        ))}
      </div>

      {steps.length > 0 && (
        <div className="px-4 pb-3 pt-1 border-t border-zinc-800/50">
          <p className="text-xs text-zinc-500">
            Steps avg: <span className="text-zinc-300">{avgSteps.toLocaleString()}/day</span>
          </p>
        </div>
      )}
    </div>
  );
}

function DomainRing({ domain: d }: { domain: DomainProgress }) {
  const meta = DOMAIN_META[d.domain as Domain];
  const pct = d.completionRate;
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-11 w-11">
        <svg className="h-11 w-11 -rotate-90" viewBox="0 0 44 44">
          <circle
            cx="22" cy="22" r="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-zinc-800"
          />
          <circle
            cx="22" cy="22" r="18"
            fill="none"
            stroke={meta?.color ?? "#666"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-zinc-400">
          {d.completed}/{d.total}
        </span>
      </div>
      <span className="text-[10px] text-zinc-500">{d.label}</span>
    </div>
  );
}
