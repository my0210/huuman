"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Dumbbell, Brain, ChevronDown, Check, Flame, Moon, ChevronRight, Play, MessageCircle } from "lucide-react";
import { SessionDetailInline } from "./SessionDetailCard";
import { useChatSend } from "@/components/chat/ChatActions";

const domainIcons: Record<string, React.ReactNode> = {
  cardio: <Heart size={14} />,
  strength: <Dumbbell size={14} />,
  mindfulness: <Brain size={14} />,
};

const domainColors: Record<string, string> = {
  cardio: "text-red-400 bg-red-950/50 border-red-900/50",
  strength: "text-orange-400 bg-orange-950/50 border-orange-900/50",
  mindfulness: "text-cyan-400 bg-cyan-950/50 border-cyan-900/50",
};

const SESSION_DOMAINS = ["cardio", "strength", "mindfulness"];

interface Session {
  id: string;
  domain: string;
  title: string;
  status: string;
  detail: Record<string, unknown>;
  scheduled_date: string;
  is_extra?: boolean;
}

interface NutritionBrief {
  calorieTarget: number;
  proteinTargetG: number;
  guidelines: string[];
}

interface SleepBrief {
  targetHours: number;
  bedtimeWindow: string;
  wakeWindow: string;
}

interface TrackingBriefs {
  nutrition: NutritionBrief;
  sleep: SleepBrief;
}

interface Habits {
  steps_actual?: number;
  steps_target?: number;
  nutrition_on_plan?: boolean;
  sleep_hours?: number;
}

interface TodayPlanData {
  date: string;
  sessions: Session[];
  habits: Habits | null;
  trackingBriefs: TrackingBriefs | null;
  hasPlan: boolean;
}

export function TodayPlanCard({ data }: { data: Record<string, unknown> }) {
  const { date, sessions: allSessions, habits, trackingBriefs, hasPlan } = data as unknown as TodayPlanData;
  const sessions = allSessions.filter((s) => SESSION_DOMAINS.includes(s.domain));

  if (!hasPlan || (sessions.length === 0 && !trackingBriefs)) {
    return (
      <div className="rounded-radius-lg border border-[var(--phase-border)] bg-[var(--phase-glass)] backdrop-blur-xl px-4 py-4 space-y-2 shadow-lg">
        <p className="text-sm font-medium text-text-secondary">No plan for today</p>
        <p className="text-xs text-text-muted">
          Ask me to generate your weekly plan to get started.
        </p>
      </div>
    );
  }

  const d = new Date(date + "T12:00:00");
  const dayName = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const completed = sessions.filter((s) => s.status === "completed").length;
  const total = sessions.length;

  return (
    <div className="rounded-radius-lg border border-[var(--phase-border)] bg-[var(--phase-glass)] backdrop-blur-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--phase-border)] flex items-center justify-between">
        <p className="text-sm font-medium text-text-primary font-heading tracking-wide">{dayName}</p>
        {total > 0 && (
          <p className={`text-xs font-medium ${completed === total ? "text-emerald-400" : "text-text-muted"}`}>
            {completed === total ? "All done" : `${completed} of ${total} sessions`}
          </p>
        )}
      </div>

      {/* Session rows */}
      {sessions.length > 0 && (
        <div className="divide-y divide-[var(--phase-border)]">
          {sessions.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      )}

      {/* Divider between sessions and tracking */}
      {trackingBriefs && (
        <>
          <div className="border-t border-dashed border-[var(--phase-border)]" />
          <div className="divide-y divide-[var(--phase-border)]">
            <NutritionRow brief={trackingBriefs.nutrition} habits={habits} />
            <SleepRow brief={trackingBriefs.sleep} habits={habits} />
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// Session Row
// =============================================================================

function sessionStartMessage(session: Session): string {
  const type = session.detail?.type as string | undefined;
  if (session.domain === "mindfulness" && type) {
    return `I'm ready for my ${session.title} — ${type}`;
  }
  return `Let's do my ${session.title} session`;
}

const domainButtonColors: Record<string, string> = {
  cardio: "bg-red-900/60 text-red-300 hover:bg-red-900/80",
  strength: "bg-orange-900/60 text-orange-300 hover:bg-orange-900/80",
  mindfulness: "bg-cyan-900/60 text-cyan-300 hover:bg-cyan-900/80",
};

function SessionRow({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false);
  const send = useChatSend();
  const colors = domainColors[session.domain] ?? "text-text-muted bg-surface-elevated border-transparent";
  const isCompleted = session.status === "completed";

  return (
    <div>
      <button
        onClick={() => !isCompleted && setExpanded(!expanded)}
        disabled={isCompleted}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          isCompleted ? "opacity-60 cursor-default" : "hover:bg-[var(--phase-accent)]/5 active:bg-[var(--phase-accent)]/10"
        }`}
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 ${colors} shadow-sm`}>
          {isCompleted ? <Check size={14} /> : domainIcons[session.domain]}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isCompleted ? "text-text-muted line-through" : "text-text-primary"}`}>
            {session.title}
          </p>
          <p className="text-xs text-text-muted capitalize">
            {session.domain}
            {session.is_extra && (
              <span className="ml-1.5 text-[10px] font-medium text-text-secondary bg-surface-elevated rounded px-1 py-px">Extra</span>
            )}
          </p>
        </div>
        {!isCompleted && (
          <ChevronDown
            size={14}
            className={`text-text-tertiary transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
          />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-3">
              <SessionDetailInline domain={session.domain} detail={session.detail} />
              {send && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => send({ text: sessionStartMessage(session) })}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors shadow-sm ${
                      domainButtonColors[session.domain] ?? "bg-surface-elevated text-text-secondary hover:bg-surface-overlay"
                    }`}
                  >
                    <Play size={10} />
                    Start
                  </button>
                  <button
                    onClick={() => send({ text: `Tell me more about my ${session.title} session` })}
                    className="flex items-center gap-1.5 rounded-lg border border-[var(--phase-border)] px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-text-muted transition-colors backdrop-blur-md"
                  >
                    <MessageCircle size={10} />
                    Ask coach
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Nutrition Row
// =============================================================================

function NutritionRow({ brief, habits }: { brief: NutritionBrief; habits: Habits | null }) {
  const send = useChatSend();
  const logged = habits?.nutrition_on_plan != null;
  const onPlan = habits?.nutrition_on_plan;

  const handleTap = () => {
    if (!send) return;
    send({
      text: logged
        ? "I want to update my nutrition log"
        : "Let's talk about my nutrition today",
    });
  };

  return (
    <button
      onClick={handleTap}
      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[var(--phase-accent)]/5 active:bg-[var(--phase-accent)]/10 transition-colors"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-green-900/50 bg-green-950/50 text-green-400 shrink-0 shadow-sm">
        <Flame size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {brief.calorieTarget} kcal · {brief.proteinTargetG}g protein
        </p>
        <p className="text-xs text-text-muted">Nutrition</p>
      </div>
      <div className="shrink-0">
        {!logged && (
          <span className="text-[11px] font-medium text-text-tertiary flex items-center gap-0.5">
            Log <ChevronRight size={12} />
          </span>
        )}
        {logged && onPlan && (
          <span className="text-xs font-medium text-green-400 flex items-center gap-1">
            <Check size={10} /> On plan
          </span>
        )}
        {logged && !onPlan && (
          <span className="text-xs font-medium text-text-muted">Off plan</span>
        )}
      </div>
    </button>
  );
}

// =============================================================================
// Sleep Row
// =============================================================================

function SleepRow({ brief, habits }: { brief: SleepBrief; habits: Habits | null }) {
  const send = useChatSend();
  const logged = habits?.sleep_hours != null;
  const hours = habits?.sleep_hours;

  const handleTap = () => {
    if (!send) return;
    send({
      text: logged
        ? "I want to update my sleep log"
        : "Log my sleep",
    });
  };

  return (
    <button
      onClick={handleTap}
      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-[var(--phase-accent)]/5 active:bg-[var(--phase-accent)]/10 transition-colors"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-900/50 bg-violet-950/50 text-violet-400 shrink-0 shadow-sm">
        <Moon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {brief.targetHours}h target · Bed {brief.bedtimeWindow}
        </p>
        <p className="text-xs text-text-muted">Sleep</p>
      </div>
      <div className="shrink-0">
        {!logged && (
          <span className="text-[11px] font-medium text-text-tertiary flex items-center gap-0.5">
            Log <ChevronRight size={12} />
          </span>
        )}
        {logged && (
          <span className={`text-xs font-medium tabular-nums ${
            (hours ?? 0) >= brief.targetHours ? "text-violet-400" : "text-text-muted"
          }`}>
            {hours}h / {brief.targetHours}h
          </span>
        )}
      </div>
    </button>
  );
}
