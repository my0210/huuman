"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Circle, ArrowRight, Repeat, ChevronDown, X } from "lucide-react";
import { DAY_LABELS, DayOfWeek } from "@/lib/types";
import { useChatSend } from "@/components/chat/ChatActions";

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

const domainDot: Record<string, string> = {
  cardio: "bg-red-400",
  strength: "bg-orange-400",
  mindfulness: "bg-cyan-400",
};

const domainBorder: Record<string, string> = {
  cardio: "border-red-900/50",
  strength: "border-orange-900/50",
  mindfulness: "border-cyan-900/50",
};

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
      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 px-4 py-4 space-y-2">
        <p className="text-sm font-medium text-zinc-300">Plan generation failed</p>
        <p className="text-xs text-zinc-500">Ask me to try again.</p>
      </div>
    );
  }

  const byDay: Record<number, Session[]> = {};
  for (const s of allSessions) {
    if (!byDay[s.day_of_week]) byDay[s.day_of_week] = [];
    byDay[s.day_of_week].push(s);
  }

  const today = new Date().toISOString().slice(0, 10);
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
    send({ text: `Move "${session.title}" to ${dayLabel} (${targetDate})` });
    setActionSession(null);
  };

  const handleSwapActivity = (session: Session) => {
    if (!send) return;
    send({ text: `I'd like a different ${session.domain} activity instead of "${session.title}"` });
    setActionSession(null);
  };

  return (
    <div className="rounded-xl border border-dashed border-zinc-600 bg-zinc-900/50 overflow-hidden">
      {/* Draft header */}
      <div className="px-4 py-2.5 border-b border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80 bg-amber-400/10 px-2 py-0.5 rounded-full">
            Draft
          </span>
          {introMessage && (
            <p className="text-xs text-zinc-500 truncate max-w-[200px]">{introMessage}</p>
          )}
        </div>
      </div>

      {/* Day strip */}
      <div className="flex border-b border-zinc-800/50">
        {DAYS.map((dow) => {
          const daySessions = byDay[dow] ?? [];
          const isSelected = selectedDay === dow;
          const isToday = selectedDay === null && daySessions.some(s => s.scheduled_date === today);

          return (
            <button
              key={dow}
              onClick={() => setSelectedDay(selectedDay === dow ? null : dow)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors ${
                isSelected || isToday ? "bg-zinc-800/50 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span>{DAY_LABELS[dow]}</span>
              {daySessions.length > 0 ? (
                <div className="flex gap-0.5">
                  {daySessions.map(s => (
                    <span key={s.id} className={`h-1.5 w-1.5 rounded-full ${domainDot[s.domain] ?? "bg-zinc-600"}`} />
                  ))}
                </div>
              ) : (
                <Circle size={6} className="text-zinc-700" />
              )}
            </button>
          );
        })}
      </div>

      {/* Sessions */}
      <div className="divide-y divide-zinc-800/50">
        {displaySessions.length === 0 ? (
          <div className="px-4 py-3 text-xs text-zinc-500">No sessions this day</div>
        ) : (
          displaySessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setActionSession(actionSession?.id === s.id ? null : s)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-800/30 transition-colors"
            >
              <span className={`h-2 w-2 rounded-full shrink-0 ${domainDot[s.domain] ?? "bg-zinc-600"}`} />
              <span className="text-sm text-zinc-300 flex-1 truncate">{s.title}</span>
              <span className="text-[10px] text-zinc-600">
                {DAY_LABELS[s.day_of_week as DayOfWeek]}
              </span>
              <ChevronDown
                size={12}
                className={`text-zinc-600 transition-transform ${actionSession?.id === s.id ? "rotate-180" : ""}`}
              />
            </button>
          ))
        )}
      </div>

      {/* Inline action panel for selected session */}
      <AnimatePresence>
        {actionSession && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-zinc-800/50"
          >
            <div className="px-4 py-3 space-y-2 bg-zinc-900/80">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                {actionSession.title}
              </p>

              {/* Move to day picker */}
              <div className="flex gap-1.5 flex-wrap">
                <span className="text-[10px] text-zinc-500 self-center mr-1">Move to</span>
                {DAYS.filter(d => d !== actionSession.day_of_week).map(dow => {
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
                      onClick={() => handleMoveSession(actionSession, targetDate, dow)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors hover:bg-zinc-700/50 ${
                        domainBorder[actionSession.domain] ?? "border-zinc-700"
                      } text-zinc-400`}
                    >
                      {DAY_LABELS[dow]}
                    </button>
                  );
                })}
              </div>

              {/* Swap activity */}
              <button
                onClick={() => handleSwapActivity(actionSession)}
                className="flex items-center gap-2 text-[11px] text-zinc-400 hover:text-zinc-300 transition-colors py-1"
              >
                <Repeat size={11} />
                <span>Different activity</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm / Rebuild footer */}
      <div className="border-t border-zinc-800/50 px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleConfirm}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-zinc-100 text-zinc-900 py-2.5 text-sm font-medium hover:bg-white transition-colors"
        >
          <Check size={14} />
          Looks good
        </button>
        <button
          onClick={handleRebuild}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-2.5 px-3"
        >
          Rebuild
        </button>
      </div>
    </div>
  );
}
