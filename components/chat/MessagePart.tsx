"use client";

import React from "react";
import type { UIMessage } from "ai";
import { isToolUIPart, isFileUIPart, getToolName } from "ai";
import { Camera } from "lucide-react";
import { TodayPlanCard } from "@/components/cards/TodayPlanCard";
import { WeekPlanCard } from "@/components/cards/WeekPlanCard";
import { DraftPlanCard } from "@/components/cards/DraftPlanCard";
import { SessionDetailCard } from "@/components/cards/SessionDetailCard";
import { ProgressRings } from "@/components/cards/ProgressRings";
import { CompletionWidget } from "@/components/cards/CompletionWidget";
import { DailyHabitWidget } from "@/components/cards/DailyHabitWidget";
import { BreathworkTimer } from "@/components/cards/BreathworkTimer";

type Part = UIMessage["parts"][number];

function formatInlineMarkdown(text: string): React.ReactNode[] {
  const result: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }
    result.push(
      <strong key={match.index} className="font-semibold text-zinc-100">
        {match[1]}
      </strong>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}

export function MessagePart({ part, role }: { part: Part; role: string }) {
  if (part.type === "text") {
    const displayText = part.text.replace(/\n?\[sessionId:[^\]]+\]/g, '');
    if (!displayText.trim()) return null;
    return (
      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
        role === "user" ? "text-zinc-100" : "text-zinc-300"
      }`}>
        {role === "user" ? displayText : formatInlineMarkdown(displayText)}
      </p>
    );
  }

  if (isFileUIPart(part) && part.mediaType.startsWith("image/")) {
    const stripped = (part as Record<string, unknown>).stripped === true;
    if (stripped || !part.url) {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-500">
          <Camera size={14} className="flex-none" />
          <span>{part.filename ?? "Photo"}</span>
        </div>
      );
    }
    return (
      <img
        src={part.url}
        alt={part.filename ?? "Uploaded image"}
        className="max-w-full rounded-xl max-h-64 object-contain"
      />
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
      if (output.isDraft && output.sessions) return <DraftPlanCard data={output} />;
      return <WeekPlanCard data={output} />;
    case "show_session":
      return <SessionDetailCard data={output} />;
    case "complete_session":
      return <CompletionWidget data={output} />;
    case "log_session":
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
      if (output.isDraft && output.sessions) return <DraftPlanCard data={output} />;
      return <PlanGenerated data={output} />;
    case "confirm_plan":
      return <PlanConfirmed data={output} />;
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
    log_session: "Logging session...",
    show_progress: "Checking progress...",
    log_daily: "Logging...",
    adapt_plan: "Adapting plan...",
    generate_plan: "Generating your plan...",
    confirm_plan: "Locking in your plan...",
    start_timer: "Starting timer...",
    save_context: "Saving context...",
    save_feedback: "Saving feedback...",
    delete_session: "Removing session...",
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-500 animate-pulse">
      {labels[toolName] ?? "Working on it..."}
    </div>
  );
}

function AdaptConfirmation({ data }: { data: Record<string, unknown> }) {
  if (data.error) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-400">
        Couldn&apos;t update that session right now. Try again in a moment.
      </div>
    );
  }

  const action = data.action as string;
  const reason = data.reason as string;
  const session = data.session as { title?: string } | null;

  const actionLabels: Record<string, string> = {
    skipped: "Skipped",
    rescheduled: "Rescheduled",
    modified: "Updated",
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 space-y-1">
      <p className="text-xs font-medium text-zinc-300">
        {actionLabels[action] ?? action}{session?.title ? `: ${session.title}` : ""}
      </p>
      <p className="text-xs text-zinc-500">{reason}</p>
    </div>
  );
}

function PlanGenerated({ data }: { data: Record<string, unknown> }) {
  if (data.error) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-400">
        Plan couldn&apos;t be generated right now. Ask me to try again.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-400">
      Your plan is ready.
    </div>
  );
}

function PlanConfirmed({ data }: { data: Record<string, unknown> }) {
  if (data.error) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-400">
        Couldn&apos;t lock in the plan. Ask me to confirm again.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-400">
      Plan locked in. Let's go.
    </div>
  );
}
