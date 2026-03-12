"use client";

import { useState } from "react";
import { Heart, Dumbbell, Brain, ChevronDown, Check, Flame, Moon, ChevronRight, Play, MessageCircle } from "lucide-react";
import { SessionDetailInline } from "./SessionDetailCard";
import { useChatSend } from "@/components/chat/ChatActions";
import { domainStyle } from "@/lib/domain-colors";

const domainIcons: Record<string, React.ReactNode> = {
  cardio: <Heart size={14} />,
  strength: <Dumbbell size={14} />,
  mindfulness: <Brain size={14} />,
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
      <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-4 space-y-2">
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
    <div className="rounded-radius-lg border border-border-default bg-surface-raised overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <p className="text-sm font-semibold text-text-primary">{dayName}</p>
        {total > 0 && (
          <p className={`text-xs font-medium ${completed === total ? "text-semantic-success" : "text-text-muted"}`}>
            {completed === total ? "All done" : `${completed} of ${total} sessions`}
          </p>
        )}
      </div>

      {sessions.length > 0 && (
        <div className="divide-y divide-border-subtle">
          {sessions.map((session) => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      )}

      {trackingBriefs && (
        <>
          <div className="border-t border-dashed border-border-subtle" />
          <div className="divide-y divide-border-subtle">
            <NutritionRow brief={trackingBriefs.nutrition} habits={habits} />
            <SleepRow brief={trackingBriefs.sleep} habits={habits} />
          </div>
        </>
      )}
    </div>
  );
}

function sessionStartMessage(session: Session): string {
  const type = session.detail?.type as string | undefined;
  if (session.domain === "mindfulness" && type) {
    return `I'm ready for my ${session.title} — ${type}`;
  }
  return `Let's do my ${session.title} session`;
}

function SessionRow({ session }: { session: Session }) {
  const [expanded, setExpanded] = useState(false);
  const send = useChatSend();
  const ds = domainStyle[session.domain as keyof typeof domainStyle];
  const iconColors = ds
    ? `${ds.text} ${ds.bg} ${ds.border}`
    : "text-text-muted bg-surface-elevated border-transparent";
  const isCompleted = session.status === "completed";

  return (
    <div>
      <button
        onClick={() => !isCompleted && setExpanded(!expanded)}
        disabled={isCompleted}
        className={`w-full flex items-center gap-3 px-4 py-3 min-h-[44px] text-left transition-colors ${
          isCompleted ? "opacity-60 cursor-default" : "active:bg-surface-overlay"
        }`}
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-radius-sm border shrink-0 ${iconColors} shadow-sm`}>
          {isCompleted ? <Check size={14} /> : domainIcons[session.domain]}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isCompleted ? "text-text-muted line-through" : "text-text-primary"}`}>
            {session.title}
          </p>
          <p className="text-xs text-text-muted capitalize">
            {session.domain}
            {session.is_extra && (
              <span className="ml-1.5 text-xs font-medium text-text-secondary bg-surface-elevated rounded px-1 py-px">Extra</span>
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

      <div className={`grid ${expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"} transition-[grid-template-rows] duration-200`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-3 space-y-3">
            <SessionDetailInline domain={session.domain} detail={session.detail} />
            {send && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => send({ text: sessionStartMessage(session) })}
                  className={`flex items-center gap-1.5 rounded-radius-sm px-3 py-1.5 text-xs font-medium min-h-[44px] active:scale-[0.97] transition-[transform] duration-100 shadow-sm ${
                    ds ? `${ds.bg} ${ds.bright}` : "bg-surface-elevated text-text-secondary"
                  }`}
                >
                  <Play size={10} />
                  Start
                </button>
                <button
                  onClick={() => send({ text: `Tell me more about my ${session.title} session` })}
                  className="flex items-center gap-1.5 rounded-radius-sm border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary min-h-[44px] active:scale-[0.97] active:text-text-primary active:border-border-strong transition-[transform] duration-100"
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
      className="w-full px-4 py-3 min-h-[44px] flex items-center gap-3 text-left active:bg-surface-overlay transition-colors"
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-radius-sm border ${domainStyle.nutrition.border} ${domainStyle.nutrition.bg} ${domainStyle.nutrition.text} shrink-0`}>
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
          <span className="text-xs font-medium text-text-tertiary flex items-center gap-0.5">
            Log <ChevronRight size={12} />
          </span>
        )}
        {logged && onPlan && (
          <span className={`text-xs font-medium ${domainStyle.nutrition.text} flex items-center gap-1`}>
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
      className="w-full px-4 py-3 min-h-[44px] flex items-center gap-3 text-left active:bg-surface-overlay transition-colors"
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-radius-sm border ${domainStyle.sleep.border} ${domainStyle.sleep.bg} ${domainStyle.sleep.text} shrink-0`}>
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
          <span className="text-xs font-medium text-text-tertiary flex items-center gap-0.5">
            Log <ChevronRight size={12} />
          </span>
        )}
        {logged && (
          <span className={`text-xs font-medium tabular-nums ${
            (hours ?? 0) >= brief.targetHours ? domainStyle.sleep.text : "text-text-muted"
          }`}>
            {hours}h / {brief.targetHours}h
          </span>
        )}
      </div>
    </button>
  );
}
