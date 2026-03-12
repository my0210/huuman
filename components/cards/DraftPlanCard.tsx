"use client";

import { useState } from "react";
import { Check, Circle, Repeat, ChevronDown } from "lucide-react";
import { DAY_LABELS, DayOfWeek } from "@/lib/types";
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
}

interface DraftPlanData {
  planId?: string;
  plan?: { id: string; intro_message?: string; week_start?: string } | null;
  sessions: Session[];
  isDraft?: boolean;
  success?: boolean;
}

const DAYS: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

export function DraftPlanCard({ data }: { data: Record<string, unknown> }) {
  const raw = data as unknown as DraftPlanData;
  const planId = raw.plan?.id ?? raw.planId;
  const allSessions = (raw.sessions ?? []).filter((s) => SESSION_DOMAINS.includes(s.domain));
  const introMessage = raw.plan?.intro_message;

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [actionSession, setActionSession] = useState<Session | null>(null);
  const send = useChatSend();

  if (allSessions.length === 0) {
    return (
      <div className="rounded-radius-lg border border-dashed border-border-default bg-surface-raised px-4 py-4 space-y-2">
        <p className="text-sm font-medium text-text-secondary">Couldn&apos;t build the plan this time</p>
        <p className="text-xs text-text-muted">Ask me to try again.</p>
      </div>
    );
  }

  const byDay: Record<number, Session[]> = {};
  for (const s of allSessions) {
    if (!byDay[s.day_of_week]) byDay[s.day_of_week] = [];
    byDay[s.day_of_week].push(s);
  }

  const today = new Date().toLocaleDateString('sv-SE');
  const filteredSessions = selectedDay !== null
    ? (byDay[selectedDay] ?? [])
    : allSessions.filter(s => s.scheduled_date === today);

  const showAll = selectedDay === null && filteredSessions.length === 0;
  const displaySessions = showAll ? allSessions : filteredSessions;

  const handleConfirm = () => {
    if (!send || !planId) return;
    send({ text: "Looks good, lock it in." });
  };

  const handleRebuild = () => {
    if (!send) return;
    send({ text: "This doesn't work for my schedule. Let me explain what needs to change." });
  };

  const handleMoveSession = (session: Session, targetDate: string, targetDow: number) => {
    if (!send) return;
    const dayLabel = DAY_LABELS[targetDow as DayOfWeek];
    send({ text: `Move "${session.title}" to ${dayLabel} (${targetDate})\n[sessionId:${session.id}]` });
    setActionSession(null);
  };

  const handleSwapActivity = (session: Session) => {
    if (!send) return;
    send({ text: `I'd like a different ${session.domain} activity instead of "${session.title}"\n[sessionId:${session.id}]` });
    setActionSession(null);
  };

  return (
    <div className="rounded-radius-lg border border-dashed border-border-default bg-surface-raised overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border-subtle space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-semantic-warning bg-semantic-warning/10 px-2 py-0.5 rounded-full">
          Draft
        </span>
        {introMessage && (
          <p className="text-xs text-text-muted">{introMessage}</p>
        )}
      </div>

      <div className="flex border-b border-border-subtle">
        {DAYS.map((dow) => {
          const daySessions = byDay[dow] ?? [];
          const isSelected = selectedDay === dow;
          const isToday = selectedDay === null && daySessions.some(s => s.scheduled_date === today);

          return (
            <button
              key={dow}
              onClick={() => setSelectedDay(selectedDay === dow ? null : dow)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 min-h-[44px] text-xs transition-colors ${
                isSelected || isToday ? "bg-surface-overlay text-text-primary" : "text-text-muted active:text-text-secondary"
              }`}
            >
              <span>{DAY_LABELS[dow]}</span>
              {daySessions.length > 0 ? (
                <div className="flex gap-0.5">
                  {daySessions.map(s => {
                    const ds = domainStyle[s.domain as keyof typeof domainStyle];
                    return (
                      <span key={s.id} className={`h-1.5 w-1.5 rounded-full ${ds?.bg ?? "bg-surface-elevated"}`} />
                    );
                  })}
                </div>
              ) : (
                <Circle size={6} className="text-text-muted" />
              )}
            </button>
          );
        })}
      </div>

      <div className="divide-y divide-border-subtle">
        {displaySessions.length === 0 ? (
          <div className="px-4 py-3 text-xs text-text-muted">No sessions this day</div>
        ) : (
          displaySessions.map((s) => {
            const isExpanded = actionSession?.id === s.id;
            const ds = domainStyle[s.domain as keyof typeof domainStyle];
            return (
              <div key={s.id}>
                <button
                  onClick={() => setActionSession(isExpanded ? null : s)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 min-h-[44px] text-left active:bg-surface-overlay transition-colors"
                >
                  <span className={`h-2 w-2 rounded-full shrink-0 ${ds?.bg ?? "bg-surface-elevated"}`} />
                  <span className="text-sm text-text-secondary flex-1 truncate">{s.title}</span>
                  <span className="text-xs text-text-muted">
                    {DAY_LABELS[s.day_of_week as DayOfWeek]}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>
                <div className={`grid ${isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"} transition-[grid-template-rows] duration-200`}>
                  <div className="overflow-hidden">
                    <div className="px-4 py-3 space-y-2 bg-surface-raised">
                      <p className="text-xs uppercase tracking-wider text-text-muted font-medium">
                        {s.title}
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        <span className="text-xs text-text-muted self-center mr-1">Move to</span>
                        {DAYS.filter(d => d !== s.day_of_week).map(dow => {
                          const weekStart = raw.plan?.week_start;
                          const daysFromMonday = dow === 0 ? 6 : dow - 1;
                          const targetDate = weekStart
                            ? (() => {
                                const d = new Date(weekStart + 'T00:00:00');
                                d.setDate(d.getDate() + daysFromMonday);
                                return d.toISOString().slice(0, 10);
                              })()
                            : '';
                          return (
                            <button
                              key={dow}
                              onClick={() => handleMoveSession(s, targetDate, dow)}
                              className={`px-2.5 py-1 rounded-radius-sm text-xs font-medium border min-h-[44px] active:scale-[0.97] active:bg-surface-elevated transition-[transform] duration-100 ${
                                ds?.border ?? "border-border-default"
                              } text-text-tertiary`}
                            >
                              {DAY_LABELS[dow]}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => handleSwapActivity(s)}
                        className="flex items-center gap-2 text-xs text-text-tertiary active:text-text-secondary transition-colors py-1 min-h-[44px]"
                      >
                        <Repeat size={11} />
                        <span>Different activity</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border-subtle px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleConfirm}
          className="flex-1 flex items-center justify-center gap-2 rounded-radius-lg bg-white text-surface-base py-2.5 text-sm font-medium min-h-[44px] active:scale-[0.97] active:brightness-90 transition-[transform] duration-100"
        >
          <Check size={14} />
          Looks good
        </button>
        <button
          onClick={handleRebuild}
          className="flex items-center gap-1.5 text-xs text-text-muted active:text-text-secondary transition-colors py-2.5 px-3 min-h-[44px]"
        >
          Rebuild
        </button>
      </div>
    </div>
  );
}
