"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Dumbbell, Brain, ChevronDown, Check, Flame, Moon } from "lucide-react";
import { SessionDetailInline } from "./SessionDetailCard";

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

  const dayName = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" });

  return (
    <div className="space-y-3">
      {sessions.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800/50">
            <p className="text-xs font-medium text-zinc-400">{dayName}</p>
            <p className="text-sm font-semibold text-zinc-200">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""} planned
            </p>
          </div>

          <div className="divide-y divide-zinc-800/50">
            {sessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </div>
        </div>
      )}

      <DailyTracking habits={habits} trackingBriefs={trackingBriefs} />
    </div>
  );
}

function DailyTracking({ habits, trackingBriefs }: { habits: Habits | null; trackingBriefs: TrackingBriefs | null }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-800/50">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Daily tracking</p>
      </div>

      <div className="divide-y divide-zinc-800/50">
        {/* Nutrition */}
        <div className="px-4 py-2.5 flex items-center gap-2.5">
          <Flame size={13} className="text-green-500 shrink-0" />
          <div className="flex-1 min-w-0">
            {trackingBriefs?.nutrition ? (
              <p className="text-xs text-zinc-300 truncate">
                {trackingBriefs.nutrition.calorieTarget} kcal · {trackingBriefs.nutrition.proteinTargetG}g protein
              </p>
            ) : (
              <p className="text-xs text-zinc-500">No targets set</p>
            )}
          </div>
          {habits?.nutrition_on_plan != null && (
            <span className={`text-xs font-medium ${habits.nutrition_on_plan ? "text-green-400" : "text-zinc-500"}`}>
              {habits.nutrition_on_plan ? "On plan" : "Off plan"}
            </span>
          )}
        </div>

        {/* Sleep */}
        <div className="px-4 py-2.5 flex items-center gap-2.5">
          <Moon size={13} className="text-violet-500 shrink-0" />
          <div className="flex-1 min-w-0">
            {trackingBriefs?.sleep ? (
              <p className="text-xs text-zinc-300 truncate">
                {trackingBriefs.sleep.targetHours}h target · Bed {trackingBriefs.sleep.bedtimeWindow}
              </p>
            ) : (
              <p className="text-xs text-zinc-500">No targets set</p>
            )}
          </div>
          {habits?.sleep_hours != null && (
            <span className="text-xs font-medium text-violet-400 tabular-nums">
              {habits.sleep_hours}h
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false);
  const colors = domainColors[session.domain] ?? "text-zinc-400 bg-zinc-900 border-zinc-800";
  const isCompleted = session.status === "completed";

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors text-left"
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${colors}`}>
          {isCompleted ? <Check size={14} /> : domainIcons[session.domain]}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isCompleted ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
            {session.title}
          </p>
          <p className="text-xs text-zinc-500 capitalize">{session.domain}</p>
        </div>
        <ChevronDown
          size={14}
          className={`text-zinc-600 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
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
            <div className="px-4 pb-3">
              <SessionDetailInline domain={session.domain} detail={session.detail} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
