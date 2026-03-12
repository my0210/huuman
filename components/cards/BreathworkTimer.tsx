"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { domainStyle } from "@/lib/domain-colors";

interface TimerData {
  minutes: number;
  label: string;
  autoTrigger?: boolean;
}

const ds = domainStyle.mindfulness;

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
    <div className={`rounded-radius-lg border ${ds.border} ${ds.bg} px-4 py-4 space-y-3`}>
      <p className={`text-xs font-medium ${ds.text}`}>{label}</p>

      <div className="flex items-center justify-center">
        <div className="relative h-24 w-24">
          <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="3" className="text-surface-overlay" />
            <circle
              cx="50" cy="50" r="42"
              fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
              className={`${ds.text} transition-all duration-1000`}
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={(2 * Math.PI * 42) * (1 - progress / 100)}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xl font-mono text-text-primary">
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setRunning(!running)}
          className={`flex h-11 w-11 items-center justify-center rounded-full ${ds.bg} ${ds.text} active:scale-[0.97] transition-[transform] duration-100`}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={() => { setRunning(false); setRemaining(totalSeconds); }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-overlay text-text-muted active:scale-[0.97] transition-[transform] duration-100"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {remaining === 0 && (
        <p className="text-center text-xs text-semantic-success">Session complete!</p>
      )}
    </div>
  );
}
