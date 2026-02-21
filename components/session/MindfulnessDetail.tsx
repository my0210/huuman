"use client";

import { Clock, Brain } from "lucide-react";

interface MindfulnessData {
  type?: string;
  durationMinutes?: number;
  guided?: boolean;
  instructions?: string;
}

export function MindfulnessDetail({ detail }: { detail: Record<string, unknown> }) {
  const d = detail as unknown as MindfulnessData;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {d.type && (
          <span className="inline-flex items-center gap-1 rounded-md bg-cyan-950/50 border border-cyan-900/50 px-2 py-0.5 text-xs font-medium text-cyan-400 capitalize">
            <Brain size={10} />
            {d.type}
          </span>
        )}
        {d.durationMinutes && (
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
            <Clock size={10} />
            {d.durationMinutes} min
          </span>
        )}
        {d.guided !== undefined && (
          <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
            {d.guided ? "Guided" : "Unguided"}
          </span>
        )}
      </div>

      {d.instructions && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">Instructions</p>
          <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">{d.instructions}</p>
        </div>
      )}
    </div>
  );
}
