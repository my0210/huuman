"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Dumbbell, Brain, Leaf, Moon, ChevronDown, Check, Footprints } from "lucide-react";
import { SessionDetailInline } from "./SessionDetailCard";

const domainIcons: Record<string, React.ReactNode> = {
  cardio: <Heart size={14} />,
  strength: <Dumbbell size={14} />,
  mindfulness: <Brain size={14} />,
  nutrition: <Leaf size={14} />,
  sleep: <Moon size={14} />,
};

const domainColors: Record<string, string> = {
  cardio: "text-red-400 bg-red-950/50 border-red-900/50",
  strength: "text-orange-400 bg-orange-950/50 border-orange-900/50",
  mindfulness: "text-cyan-400 bg-cyan-950/50 border-cyan-900/50",
  nutrition: "text-green-400 bg-green-950/50 border-green-900/50",
  sleep: "text-violet-400 bg-violet-950/50 border-violet-900/50",
};

interface Session {
  id: string;
  domain: string;
  title: string;
  status: string;
  detail: Record<string, unknown>;
  scheduled_date: string;
}

interface TodayPlanData {
  date: string;
  sessions: Session[];
  habits: { steps_actual?: number; steps_target?: number } | null;
  hasPlan: boolean;
}

export function TodayPlanCard({ data }: { data: Record<string, unknown> }) {
  const { date, sessions, habits, hasPlan } = data as unknown as TodayPlanData;

  if (!hasPlan || sessions.length === 0) {
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800/50">
        <p className="text-xs font-medium text-zinc-400">{dayName}</p>
        <p className="text-sm font-semibold text-zinc-200">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""} planned
        </p>
      </div>

      {/* Steps tracker */}
      {habits && (
        <div className="px-4 py-2 border-b border-zinc-800/50 flex items-center gap-2">
          <Footprints size={12} className="text-zinc-500" />
          <div className="flex-1">
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-zinc-400 transition-all"
                style={{
                  width: `${Math.min(100, ((habits.steps_actual ?? 0) / (habits.steps_target ?? 10000)) * 100)}%`,
                }}
              />
            </div>
          </div>
          <span className="text-xs text-zinc-500">
            {(habits.steps_actual ?? 0).toLocaleString()} / {((habits.steps_target ?? 10000) / 1000).toFixed(0)}k
          </span>
        </div>
      )}

      <div className="divide-y divide-zinc-800/50">
        {sessions.map((session) => (
          <SessionRow key={session.id} session={session} />
        ))}
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
