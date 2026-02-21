"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";

interface TimerData {
  minutes: number;
  label: string;
  autoTrigger?: boolean;
}

export function BreathworkTimer({ data }: { data: Record<string, unknown> }) {
  const { minutes, label, autoTrigger } = data as unknown as TimerData;
  const totalSeconds = minutes * 60;

  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(!!autoTrigger);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, remaining]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = ((totalSeconds - remaining) / totalSeconds) * 100;

  return (
    <div className="rounded-xl border border-cyan-900/50 bg-cyan-950/20 px-4 py-4 space-y-3">
      <p className="text-xs font-medium text-cyan-400">{label}</p>

      <div className="flex items-center justify-center">
        <div className="relative h-24 w-24">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="3" className="text-zinc-800" />
            <circle
              cx="50" cy="50" r="42"
              fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
              className="text-cyan-400 transition-all duration-1000"
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={(2 * Math.PI * 42) * (1 - progress / 100)}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xl font-mono text-zinc-200">
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setRunning(!running)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={() => { setRunning(false); setRemaining(totalSeconds); }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {remaining === 0 && (
        <p className="text-center text-xs text-emerald-400">Session complete!</p>
      )}
    </div>
  );
}
