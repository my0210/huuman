"use client";

import { useState } from "react";
import { Check, Circle, ChevronDown, Play, MessageCircle } from "lucide-react";
import { DAY_LABELS, DayOfWeek } from "@/lib/types";
import { SessionDetailInline } from "./SessionDetailCard";
import { useChatSend } from "@/components/chat/ChatActions";
import { domainStyle } from "@/lib/domain-colors";

const SESSION_DOMAINS = ["cardio", "strength", "mindfulness"];

interface Session {
  id: string;
  domain: string;
  title: string;
  status: string;
  day_of_week: number;
  scheduled_date: string;
  is_extra?: boolean;
  detail: Record<string, unknown>;
}

interface WeekPlanData {
  weekStart: string;
  sessions: Session[];
  hasPlan: boolean;
}

export function WeekPlanCard({ data }: { data: Record<string, unknown> }) {
  const { sessions: allSessions, hasPlan } = data as unknown as WeekPlanData;
  const sessions = allSessions.filter((s) => SESSION_DOMAINS.includes(s.domain));
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  if (!hasPlan || sessions.length === 0) {
    return (
      <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-4 space-y-2">
        <p className="text-sm font-medium text-text-secondary">No plan this week</p>
        <p className="text-xs text-text-muted">
          Ask me to generate your weekly plan.
        </p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('sv-SE');

  const byDay: Record<number, Session[]> = {};
  for (const s of sessions) {
    if (!byDay[s.day_of_week]) byDay[s.day_of_week] = [];
    byDay[s.day_of_week].push(s);
  }

  const days: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

  const filteredSessions = selectedDay !== null
    ? (byDay[selectedDay] ?? [])
    : sessions.filter(s => s.scheduled_date === today);

  return (
    <div className="rounded-radius-lg border border-border-default bg-surface-raised overflow-hidden">
      <div className="flex border-b border-border-subtle">
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
              className={`flex-1 flex flex-col items-center gap-1 py-2 min-h-[44px] text-xs transition-colors ${
                isToday ? "bg-surface-overlay text-text-primary" : "text-text-muted active:text-text-secondary"
              }`}
            >
              <span>{DAY_LABELS[dow]}</span>
              {daySessions.length > 0 ? (
                allDone ? (
                  <Check size={10} className="text-semantic-success" />
                ) : (
                  <div className="flex gap-0.5">
                    {daySessions.map(s => {
                      const ds = domainStyle[s.domain as keyof typeof domainStyle];
                      return (
                        <span key={s.id} className={`h-1.5 w-1.5 rounded-full ${ds?.bg ?? "bg-surface-elevated"}`} />
                      );
                    })}
                  </div>
                )
              ) : (
                <Circle size={6} className="text-text-muted" />
              )}
            </button>
          );
        })}
      </div>

      <div className="divide-y divide-border-subtle">
        {filteredSessions.length === 0 ? (
          <div className="px-4 py-3 text-xs text-text-muted">
            {selectedDay !== null ? "No sessions this day" : "No sessions today"}
          </div>
        ) : (
          filteredSessions.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))
        )}
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false);
  const send = useChatSend();
  const isCompleted = session.status === "completed";
  const ds = domainStyle[session.domain as keyof typeof domainStyle];

  return (
    <div>
      <button
        onClick={() => !isCompleted && setExpanded(!expanded)}
        disabled={isCompleted}
        className={`w-full flex items-center gap-3 px-4 py-2.5 min-h-[44px] text-left transition-colors ${
          isCompleted ? "opacity-60 cursor-default" : "active:bg-surface-overlay"
        }`}
      >
        <span className={`h-2 w-2 rounded-full shrink-0 ${ds?.bg ?? "bg-surface-elevated"}`} />
        <span className={`text-sm flex-1 ${isCompleted ? "text-text-muted line-through" : "text-text-secondary"}`}>
          {session.title}
          {session.is_extra && (
            <span className="ml-1.5 text-xs font-medium text-text-muted bg-surface-overlay rounded px-1 py-px align-middle">Extra</span>
          )}
        </span>
        {isCompleted && <Check size={12} className="text-semantic-success shrink-0" />}
        {!isCompleted && (
          <ChevronDown
            size={12}
            className={`text-text-muted transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
          />
        )}
      </button>

      <div className={`grid ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"} transition-[grid-template-rows] duration-200`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-3 space-y-3">
            <SessionDetailInline domain={session.domain} detail={session.detail} />
            {send && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => send({ text: `Let's do my ${session.title} session` })}
                  className={`flex items-center gap-1.5 rounded-radius-sm px-3 py-1.5 text-xs font-medium min-h-[44px] active:scale-[0.97] transition-[transform] duration-100 ${
                    ds ? `${ds.bg} ${ds.bright}` : "bg-surface-overlay text-text-secondary"
                  }`}
                >
                  <Play size={10} />
                  Start
                </button>
                <button
                  onClick={() => send({ text: `Tell me more about my ${session.title} session` })}
                  className="flex items-center gap-1.5 rounded-radius-sm border border-border-default px-3 py-1.5 text-xs font-medium text-text-tertiary min-h-[44px] active:scale-[0.97] active:text-text-secondary active:border-border-strong transition-[transform] duration-100"
                >
                  <MessageCircle size={10} />
                  Ask coach
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
