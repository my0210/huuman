"use client";

import { Heart, Clock, Activity } from "lucide-react";

export function CardioDetail({ detail }: { detail: Record<string, unknown> }) {
  const zone = extractZone(detail);
  const duration = extractDuration(detail);
  const activity = String(detail.activityType ?? detail.activity ?? "");
  const hrDisplay = extractHR(detail);
  const warmUp = detail.warmUp as string | undefined;
  const coolDown = detail.coolDown as string | undefined;
  const mainSet = detail.mainSet as string | undefined;
  const cues = toStringArray(detail.cues ?? detail.pacingCues);
  const notes = detail.notes as string | undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {zone !== null && (
          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
            zone === 2
              ? "bg-emerald-950/50 text-emerald-400 border border-emerald-900/50"
              : "bg-red-950/50 text-red-400 border border-red-900/50"
          }`}>
            <Heart size={10} />
            Zone {zone}
          </span>
        )}
        {duration && (
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
            <Clock size={10} />
            {duration}
          </span>
        )}
        {activity && (
          <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 capitalize">
            <Activity size={10} />
            {activity}
          </span>
        )}
      </div>

      {hrDisplay && (
        <p className="text-xs text-zinc-400">
          Target HR: <span className="text-zinc-300">{hrDisplay}</span>
        </p>
      )}

      {warmUp && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-0.5">Warm-up</p>
          <p className="text-xs text-zinc-400">{warmUp}</p>
        </div>
      )}

      {mainSet && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-0.5">Main set</p>
          <p className="text-xs text-zinc-400">{mainSet}</p>
        </div>
      )}

      {coolDown && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-0.5">Cool-down</p>
          <p className="text-xs text-zinc-400">{coolDown}</p>
        </div>
      )}

      {cues.length > 0 && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">Pacing cues</p>
          <ul className="space-y-0.5">
            {cues.map((cue, i) => (
              <li key={i} className="text-xs text-zinc-400 flex gap-1.5">
                <span className="text-zinc-600">•</span> {cue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notes && (
        <p className="text-xs text-zinc-500 italic">{notes}</p>
      )}
    </div>
  );
}

function extractZone(d: Record<string, unknown>): number | null {
  const raw = d.zone;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const match = raw.match(/(\d)/);
    return match ? Number(match[1]) : null;
  }
  return null;
}

function extractDuration(d: Record<string, unknown>): string | null {
  if (d.targetMinutes) return `${d.targetMinutes} min`;
  if (d.duration) return String(d.duration);
  return null;
}

function extractHR(d: Record<string, unknown>): string | null {
  if (d.targetHrRange && typeof d.targetHrRange === 'object') {
    const hr = d.targetHrRange as { min?: number; max?: number };
    if (hr.min && hr.max) return `${hr.min}-${hr.max} bpm`;
  }
  if (d.targetHR) return String(d.targetHR);
  return null;
}

function toStringArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') return [val];
  return [];
}
