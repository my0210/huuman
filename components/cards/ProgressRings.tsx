"use client";

import { DOMAIN_META, Domain } from "@/lib/types";

interface DomainProgress {
  domain: string;
  label: string;
  total: number;
  completed: number;
  skipped: number;
  completionRate: number;
}

interface StepDay {
  date: string;
  steps: number;
  target: number;
}

export interface ProgressData {
  weekStart: string;
  hasPlan: boolean;
  progress: DomainProgress[];
  steps: StepDay[];
  avgSleepHours: number | null;
}

export function ProgressRings({ data }: { data: Record<string, unknown> }) {
  const { weekStart, hasPlan, progress, steps, avgSleepHours } = data as unknown as ProgressData;

  const hasAnyData = progress.some(d => d.total > 0 || d.completed > 0) || steps.some(s => s.steps > 0);

  if (!hasPlan && !hasAnyData) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800/50">
          <p className="text-sm font-semibold text-zinc-200">This Week</p>
        </div>
        <div className="px-4 py-6 text-center">
          <p className="text-xs text-zinc-500">No active plan yet.</p>
          <p className="text-xs text-zinc-600 mt-1">Ask me to generate your weekly plan.</p>
        </div>
      </div>
    );
  }

  const totalSteps = steps.reduce((s, d) => s + d.steps, 0);
  const avgSteps = steps.length > 0 ? Math.round(totalSteps / steps.length) : 0;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800/50">
        <p className="text-sm font-semibold text-zinc-200">This Week</p>
      </div>

      <div className="grid grid-cols-5 gap-1 px-4 py-4">
        {progress.map((d) => (
          <DomainRing
            key={d.domain}
            domain={d}
            centerOverride={d.domain === 'sleep' && avgSleepHours != null ? `${avgSleepHours}h` : undefined}
          />
        ))}
      </div>

      {steps.length > 0 && (
        <div className="px-4 pb-3 pt-1 border-t border-zinc-800/50 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Steps: <span className="text-zinc-300">{avgSteps.toLocaleString()}/day</span>
          </p>
          <StepDots steps={steps} weekStart={weekStart} />
        </div>
      )}
    </div>
  );
}

const CIRCUMFERENCE = 2 * Math.PI * 18;

function DomainRing({ domain: d, centerOverride }: { domain: DomainProgress; centerOverride?: string }) {
  const meta = DOMAIN_META[d.domain as Domain];
  const color = meta?.color ?? "#666";

  const completedFrac = d.total > 0 ? d.completed / d.total : 0;
  const skippedFrac = d.total > 0 ? d.skipped / d.total : 0;
  const completedLen = completedFrac * CIRCUMFERENCE;
  const skippedLen = skippedFrac * CIRCUMFERENCE;

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
          {d.skipped > 0 && (
            <circle
              cx="22" cy="22" r="18"
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeOpacity={0.25}
              strokeDasharray={`${skippedLen} ${CIRCUMFERENCE - skippedLen}`}
              strokeDashoffset={-completedLen}
              className="transition-all duration-500"
            />
          )}
          {d.completed > 0 && (
            <circle
              cx="22" cy="22" r="18"
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE - completedLen}
              className="transition-all duration-500"
            />
          )}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-zinc-400">
          {centerOverride ?? `${d.completed}/${d.total}`}
        </span>
      </div>
      <span className="text-[10px] text-zinc-500">{d.label}</span>
    </div>
  );
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function StepDots({ steps, weekStart }: { steps: StepDay[]; weekStart: string }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + 'T12:00:00Z');
    d.setDate(d.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    const entry = steps.find(s => s.date === date);
    return { date, steps: entry?.steps ?? 0, target: entry?.target ?? 10000, hasData: !!entry };
  });

  return (
    <div className="flex items-center gap-1.5">
      {days.map((d, i) => (
        <div key={d.date} className="flex flex-col items-center gap-0.5">
          <div className={`h-1.5 w-1.5 rounded-full ${
            d.hasData && d.steps >= d.target
              ? 'bg-emerald-400'
              : d.hasData && d.steps > 0
                ? 'bg-zinc-500'
                : 'bg-zinc-800'
          }`} />
          <span className="text-[8px] text-zinc-600">{DAY_LABELS[i]}</span>
        </div>
      ))}
    </div>
  );
}
