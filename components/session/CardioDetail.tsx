"use client";

import { Heart, Clock, Activity } from "lucide-react";

interface CardioData {
  zone?: number;
  targetMinutes?: number;
  activityType?: string;
  targetHrRange?: { min: number; max: number };
  warmUp?: string;
  coolDown?: string;
  cues?: string[];
}

export function CardioDetail({ detail }: { detail: Record<string, unknown> }) {
  const d = detail as unknown as CardioData;

  return (
    <div className="space-y-3">
      {/* Zone + duration badges */}
      <div className="flex gap-2">
        {d.zone && (
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
            d.zone === 2
              ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900/50"
              : "bg-red-950/50 text-red-400 border border-red-900/50"
          }`}>
            <Heart size={10} />
            Zone {d.zone}
          </span>
        )}
        {d.targetMinutes && (
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
            <Clock size={10} />
            {d.targetMinutes} min
          </span>
        )}
        {d.activityType && (
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 capitalize">
            <Activity size={10} />
            {d.activityType}
          </span>
        )}
      </div>

      {/* HR Range */}
      {d.targetHrRange && (
        <p className="text-xs text-zinc-400">
          Target HR: <span className="text-zinc-300">{d.targetHrRange.min}-{d.targetHrRange.max} bpm</span>
        </p>
      )}

      {/* Warm-up / Cool-down */}
      {d.warmUp && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-0.5">Warm-up</p>
          <p className="text-xs text-zinc-400">{d.warmUp}</p>
        </div>
      )}
      {d.coolDown && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-0.5">Cool-down</p>
          <p className="text-xs text-zinc-400">{d.coolDown}</p>
        </div>
      )}

      {/* Cues */}
      {d.cues && d.cues.length > 0 && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">Pacing cues</p>
          <ul className="space-y-0.5">
            {d.cues.map((cue, i) => (
              <li key={i} className="text-xs text-zinc-400 flex gap-1.5">
                <span className="text-zinc-600">•</span> {cue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
