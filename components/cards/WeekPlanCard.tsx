"use client";

import { useState } from "react";
import { Check, Circle } from "lucide-react";
import { DAY_LABELS, DayOfWeek } from "@/lib/types";

interface Session {
  id: string;
  domain: string;
  title: string;
  status: string;
  day_of_week: number;
  scheduled_date: string;
}

interface WeekPlanData {
  weekStart: string;
  plan: { intro_message?: string } | null;
  sessions: Session[];
  hasPlan: boolean;
}

const domainDot: Record<string, string> = {
  cardio: "bg-red-400",
  strength: "bg-orange-400",
  mindfulness: "bg-cyan-400",
  nutrition: "bg-green-400",
  sleep: "bg-violet-400",
};

export function WeekPlanCard({ data }: { data: Record<string, unknown> }) {
  const { weekStart, plan, sessions, hasPlan } = data as unknown as WeekPlanData;
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  if (!hasPlan || sessions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-4 space-y-2">
        <p className="text-sm font-medium text-zinc-300">No plan this week</p>
        <p className="text-xs text-zinc-500">
          Ask me to generate your weekly plan.
        </p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  // Group sessions by day
  const byDay: Record<number, Session[]> = {};
  for (const s of sessions) {
    if (!byDay[s.day_of_week]) byDay[s.day_of_week] = [];
    byDay[s.day_of_week].push(s);
  }

  const days: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

  const filteredSessions = selectedDay !== null
    ? (byDay[selectedDay] ?? [])
    : sessions.filter(s => s.scheduled_date === today);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {plan?.intro_message && (
        <div className="px-4 py-3 border-b border-zinc-800/50">
          <p className="text-xs text-zinc-400 leading-relaxed">{plan.intro_message}</p>
        </div>
      )}

      {/* Day strip */}
      <div className="flex border-b border-zinc-800/50">
        {days.map((dow) => {
          const daySessions = byDay[dow] ?? [];
          const allDone = daySessions.length > 0 && daySessions.every(s => s.status === "completed");
          const isToday = selectedDay === null
            ? daySessions.some(s => s.scheduled_date === today)
            : selectedDay === dow;

          return (
            <button
              key={dow}
              onClick={() => setSelectedDay(selectedDay === dow ? null : dow)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                isToday ? "bg-zinc-800/50 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span>{DAY_LABELS[dow]}</span>
              {daySessions.length > 0 ? (
                allDone ? (
                  <Check size={10} className="text-emerald-400" />
                ) : (
                  <div className="flex gap-0.5">
                    {daySessions.map(s => (
                      <span key={s.id} className={`h-1.5 w-1.5 rounded-full ${domainDot[s.domain] ?? "bg-zinc-600"}`} />
                    ))}
                  </div>
                )
              ) : (
                <Circle size={6} className="text-zinc-700" />
              )}
            </button>
          );
        })}
      </div>

      {/* Sessions for selected/today */}
      <div className="divide-y divide-zinc-800/50">
        {filteredSessions.length === 0 ? (
          <div className="px-4 py-3 text-xs text-zinc-500">
            {selectedDay !== null ? "No sessions this day" : "No sessions today"}
          </div>
        ) : (
          filteredSessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`h-2 w-2 rounded-full ${domainDot[s.domain] ?? "bg-zinc-600"}`} />
              <span className={`text-sm flex-1 ${s.status === "completed" ? "text-zinc-500 line-through" : "text-zinc-300"}`}>
                {s.title}
              </span>
              {s.status === "completed" && <Check size={12} className="text-emerald-400" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
