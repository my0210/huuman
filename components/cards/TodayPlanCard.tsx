"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Dumbbell, Brain, ChevronDown, Check, Flame, Moon, ChevronRight } from "lucide-react";
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
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-4 space-y-2">
        <p className="text-sm font-medium text-zinc-300">No plan for today</p>
        <p className="text-xs text-zinc-500">
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-200">{dayName}</p>
        {total > 0 && (
          <p className={`text-xs font-medium ${completed === total ? "text-emerald-400" : "text-zinc-500"}`}>
            {completed === total ? "All done" : `${completed} of ${total} sessions`}
          </p>
        )}
      </div>

      {/* Session rows */}
      {sessions.length > 0 && (
        <div className="divide-y divide-zinc-800/50">
          {sessions.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      )}

      {/* Divider between sessions and tracking */}
      {trackingBriefs && (
        <>
          <div className="border-t border-dashed border-zinc-800" />
          <div className="divide-y divide-zinc-800/50">
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

function sessionTapMessage(session: Session): string {
  const type = session.detail?.type as string | undefined;
  if (session.domain === "mindfulness" && type) {
    return `I'm ready for my ${session.title} — ${type}`;
  }
  return `Let's do my ${session.title} session`;
}

function SessionRow({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false);
  const send = useChatSend();
  const colors = domainColors[session.domain] ?? "text-zinc-400 bg-zinc-900 border-zinc-800";
  const isCompleted = session.status === "completed";

  const handleTap = () => {
    if (isCompleted || !send) return;
    send({ text: sessionTapMessage(session) });
  };

  return (
    <div>
      <div className="flex items-center">
        <button
          onClick={handleTap}
          disabled={isCompleted}
          className={`flex-1 flex items-center gap-3 px-4 py-3 text-left transition-colors ${
            isCompleted ? "opacity-60 cursor-default" : "hover:bg-zinc-800/30 active:bg-zinc-800/50"
          }`}
        >
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 ${colors}`}>
            {isCompleted ? <Check size={14} /> : domainIcons[session.domain]}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${isCompleted ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
              {session.title}
            </p>
            <p className="text-xs text-zinc-500 capitalize">{session.domain}</p>
          </div>
          {!isCompleted && (
            <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-0.5 shrink-0">
              Start <ChevronRight size={12} />
            </span>
          )}
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-3 text-zinc-600 hover:text-zinc-400 transition-colors self-stretch flex items-center border-l border-zinc-800/50"
        >
          <ChevronDown
            size={14}
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3">
              <SessionDetailInline domain={session.domain} detail={session.detail} />
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
      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-zinc-800/30 active:bg-zinc-800/50 transition-colors"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-green-900/50 bg-green-950/50 text-green-400 shrink-0">
        <Flame size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">
          {brief.calorieTarget} kcal · {brief.proteinTargetG}g protein
        </p>
        <p className="text-xs text-zinc-500">Nutrition</p>
      </div>
      <div className="shrink-0">
        {!logged && (
          <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-0.5">
            Log <ChevronRight size={12} />
          </span>
        )}
        {logged && onPlan && (
          <span className="text-xs font-medium text-green-400 flex items-center gap-1">
            <Check size={10} /> On plan
          </span>
        )}
        {logged && !onPlan && (
          <span className="text-xs font-medium text-zinc-500">Off plan</span>
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
      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-zinc-800/30 active:bg-zinc-800/50 transition-colors"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-900/50 bg-violet-950/50 text-violet-400 shrink-0">
        <Moon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">
          {brief.targetHours}h target · Bed {brief.bedtimeWindow}
        </p>
        <p className="text-xs text-zinc-500">Sleep</p>
      </div>
      <div className="shrink-0">
        {!logged && (
          <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-0.5">
            Log <ChevronRight size={12} />
          </span>
        )}
        {logged && (
          <span className={`text-xs font-medium tabular-nums ${
            (hours ?? 0) >= brief.targetHours ? "text-violet-400" : "text-zinc-400"
          }`}>
            {hours}h / {brief.targetHours}h
          </span>
        )}
      </div>
    </button>
  );
}
