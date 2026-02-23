"use client";

import type { UIMessage } from "ai";
import { isToolUIPart, getToolName } from "ai";
import { TodayPlanCard } from "@/components/cards/TodayPlanCard";
import { WeekPlanCard } from "@/components/cards/WeekPlanCard";
import { SessionDetailCard } from "@/components/cards/SessionDetailCard";
import { ProgressRings } from "@/components/cards/ProgressRings";
import { CompletionWidget } from "@/components/cards/CompletionWidget";
import { DailyHabitWidget } from "@/components/cards/DailyHabitWidget";
import { BreathworkTimer } from "@/components/cards/BreathworkTimer";

type Part = UIMessage["parts"][number];

export function MessagePart({ part, role }: { part: Part; role: string }) {
  if (part.type === "text") {
    return (
      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
        role === "user" ? "text-zinc-100" : "text-zinc-300"
      }`}>
        {part.text}
      </p>
    );
  }

  if (isToolUIPart(part)) {
    const toolName = getToolName(part);
    const toolPart = part as {
      type: string;
      state: string;
      toolName?: string;
      output?: unknown;
      input?: unknown;
    };
    return <ToolPart toolName={toolName} state={toolPart.state} output={toolPart.output as Record<string, unknown> | undefined} />;
  }

  return null;
}

function ToolPart({
  toolName,
  state,
  output,
}: {
  toolName: string;
  state: string;
  output?: Record<string, unknown>;
}) {
  if (state === "input-available" || state === "partial-call" || state === "input-streaming") {
    return <LoadingCard toolName={toolName} />;
  }

  if (state === "output-error") {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-xs text-red-400">
        Something went wrong. Try again.
      </div>
    );
  }

  if (state !== "output-available" || !output) {
    return null;
  }

  switch (toolName) {
    case "show_today_plan":
      return <TodayPlanCard data={output} />;
    case "show_week_plan":
      return <WeekPlanCard data={output} />;
    case "show_session":
      return <SessionDetailCard data={output} />;
    case "complete_session":
      return <CompletionWidget data={output} />;
    case "show_progress":
      return <ProgressRings data={output} />;
    case "log_daily":
      return <DailyHabitWidget data={output} />;
    case "start_timer":
      return <BreathworkTimer data={output} />;
    case "adapt_plan":
      return <AdaptConfirmation data={output} />;
    case "generate_plan":
      return <PlanGenerated data={output} />;
    default:
      return null;
  }
}

function LoadingCard({ toolName }: { toolName: string }) {
  const labels: Record<string, string> = {
    show_today_plan: "Loading today's plan...",
    show_week_plan: "Loading week plan...",
    show_session: "Loading session...",
    complete_session: "Completing session...",
    show_progress: "Checking progress...",
    log_daily: "Logging...",
    adapt_plan: "Adapting plan...",
    generate_plan: "Generating your plan...",
    start_timer: "Starting timer...",
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-500 animate-pulse">
      {labels[toolName] ?? "Working on it..."}
    </div>
  );
}

function AdaptConfirmation({ data }: { data: Record<string, unknown> }) {
  const action = data.action as string;
  const reason = data.reason as string;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 space-y-1">
      <p className="text-xs font-medium text-zinc-300">
        Plan updated: {action}
      </p>
      <p className="text-xs text-zinc-500">{reason}</p>
    </div>
  );
}

function PlanGenerated({ data }: { data: Record<string, unknown> }) {
  if (data.error) {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-xs text-red-400">
        {String(data.error)}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-400">
      Your weekly plan has been generated!
    </div>
  );
}
