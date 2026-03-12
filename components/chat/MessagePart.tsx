"use client";

import React, { useState } from "react";
import type { UIMessage } from "ai";
import { isToolUIPart, isFileUIPart, getToolName } from "ai";
import { Camera, Pencil, Scale, Utensils } from "lucide-react";
import { TodayPlanCard } from "@/components/cards/TodayPlanCard";
import { WeekPlanCard } from "@/components/cards/WeekPlanCard";
import { DraftPlanCard } from "@/components/cards/DraftPlanCard";
import { SessionDetailCard } from "@/components/cards/SessionDetailCard";
import { ProgressRings } from "@/components/cards/ProgressRings";
import { CoachSessionCard } from "@/components/cards/CoachSessionCard";
import { CoachSleepCard } from "@/components/cards/CoachSleepCard";
import { DailyHabitWidget } from "@/components/cards/DailyHabitWidget";
import { BreathworkTimer } from "@/components/cards/BreathworkTimer";
import { YouTubeVideoCard } from "@/components/cards/YouTubeVideoCard";
import { PhotoShareButton } from "@/components/share/PhotoShareButton";

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
      <strong key={match.index} className="font-semibold text-text-primary">
        {match[1]}
      </strong>,
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
    const displayText = part.text.replace(/\n?\[sessionId:[^\]]+\]/g, "");
    if (!displayText.trim()) return null;
    return (
      <p
        className={`text-sm leading-relaxed whitespace-pre-wrap ${
          role === "user" ? "text-text-primary" : "text-text-secondary"
        }`}
      >
        {role === "user" ? displayText : formatInlineMarkdown(displayText)}
      </p>
    );
  }

  if (isFileUIPart(part) && part.mediaType.startsWith("image/")) {
    const stripped = (part as Record<string, unknown>).stripped === true;
    if (stripped || !part.url) {
      return (
        <div className="flex items-center gap-2 rounded-radius-lg border border-border-default bg-surface-raised px-3 py-2 text-xs text-text-muted">
          <Camera size={14} className="flex-none" />
          <span>{part.filename ?? "Photo"}</span>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <img
          src={part.url}
          alt={part.filename ?? "Uploaded image"}
          className="max-w-full rounded-radius-lg max-h-64 object-contain"
        />
        <PhotoShareButton
          imageUrl={part.url}
          filename={part.filename ?? "huuman-photo.jpg"}
          label="Share"
          className="w-full justify-center"
        />
      </div>
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
    return (
      <ToolPart
        toolName={toolName}
        state={toolPart.state}
        output={toolPart.output as Record<string, unknown> | undefined}
      />
    );
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
  if (
    state === "input-available" ||
    state === "partial-call" ||
    state === "input-streaming"
  ) {
    return <LoadingCard toolName={toolName} />;
  }

  if (state === "output-error") {
    return (
      <div className="rounded-radius-lg border border-semantic-error/30 bg-semantic-error-muted px-4 py-3 text-xs text-semantic-error">
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
      if (output.isDraft && output.sessions)
        return <DraftPlanCard data={output} />;
      return <WeekPlanCard data={output} />;
    case "show_session":
      return <SessionDetailCard data={output} />;
    case "complete_session":
      return <CoachSessionCard data={output} />;
    case "log_session":
      return <CoachSessionCard data={output} />;
    case "show_progress":
      return <ProgressRings data={output} />;
    case "log_daily": {
      const logged = output?.logged as Record<string, unknown> | undefined;
      if (
        logged?.sleep_hours != null &&
        !logged?.steps_actual &&
        logged?.nutrition_on_plan == null
      ) {
        return <CoachSleepCard data={output} />;
      }
      return <DailyHabitWidget data={output} />;
    }
    case "start_timer":
      return <BreathworkTimer data={output} />;
    case "adapt_plan":
      return <AdaptConfirmation data={output} />;
    case "generate_plan":
      if (output.isDraft && output.sessions)
        return <DraftPlanCard data={output} />;
      return <PlanGenerated data={output} />;
    case "confirm_plan":
      return <PlanConfirmed data={output} />;
    case "search_youtube":
      return <YouTubeVideoCard data={output} />;
    case "save_progress_photo":
      return <SavedPhotoCard data={output} />;
    case "save_meal_photo":
      return <SavedMealCard data={output} />;
    case "log_weight":
      return <WeightLogCard data={output} />;
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
    search_youtube: "Searching videos...",
    save_progress_photo: "Saving progress photo...",
    save_meal_photo: "Logging meal...",
    log_weight: "Logging weight...",
    get_progress_photos: "Loading progress photos...",
    get_meal_photos: "Loading meal log...",
  };

  return (
    <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 text-xs text-text-muted animate-pulse">
      {labels[toolName] ?? "Working on it..."}
    </div>
  );
}

function AdaptConfirmation({ data }: { data: Record<string, unknown> }) {
  if (data.error) {
    return (
      <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 text-xs text-text-tertiary">
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
    <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 space-y-1">
      <p className="text-xs font-medium text-text-secondary">
        {actionLabels[action] ?? action}
        {session?.title ? `: ${session.title}` : ""}
      </p>
      <p className="text-xs text-text-muted">{reason}</p>
    </div>
  );
}

function PlanGenerated({ data }: { data: Record<string, unknown> }) {
  if (data.error) {
    return (
      <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 text-xs text-text-tertiary">
        Plan couldn&apos;t be generated right now. Ask me to try again.
      </div>
    );
  }

  return (
    <div className="rounded-radius-lg border border-semantic-success/30 bg-semantic-success-muted px-4 py-3 text-xs text-semantic-success">
      Your plan is ready.
    </div>
  );
}

function PlanConfirmed({ data }: { data: Record<string, unknown> }) {
  if (data.error) {
    return (
      <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 text-xs text-text-tertiary">
        Couldn&apos;t lock in the plan. Ask me to confirm again.
      </div>
    );
  }

  return (
    <div className="rounded-radius-lg border border-semantic-success/30 bg-semantic-success-muted px-4 py-3 text-xs text-semantic-success">
      Plan locked in. Let&apos;s go.
    </div>
  );
}

function EditableDate({
  date,
  onUpdate,
}: {
  date: string;
  onUpdate: (newDate: string) => void;
}) {
  const label = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="relative inline-flex items-center gap-1 text-xs text-text-muted active:text-text-secondary transition-colors cursor-pointer">
      <span>{label}</span>
      <Pencil size={9} />
      <input
        type="date"
        value={date}
        onChange={(e) => {
          if (e.target.value) onUpdate(e.target.value);
        }}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </div>
  );
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

function EditableMealType({
  value,
  onUpdate,
}: {
  value: string | null;
  onUpdate: (mt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = value
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : "Set type";

  if (open) {
    return (
      <div className="flex gap-1.5">
        {MEAL_TYPES.map((mt) => (
          <button
            key={mt}
            onClick={() => {
              onUpdate(mt);
              setOpen(false);
            }}
            className={`min-h-[44px] rounded-full px-3 py-1 text-xs font-medium transition-colors duration-100 ${
              mt === value
                ? "bg-semantic-success-muted text-semantic-success"
                : "bg-surface-elevated text-text-muted active:text-text-secondary"
            }`}
          >
            {mt.charAt(0).toUpperCase() + mt.slice(1)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-1 rounded-full bg-semantic-success-muted px-2.5 py-1 text-xs font-medium text-semantic-success active:brightness-110 transition-[filter] duration-100"
    >
      <span>{label}</span>
      <Pencil size={9} />
    </button>
  );
}

function SavedPhotoCard({ data }: { data: Record<string, unknown> }) {
  const [date, setDate] = useState(data.capturedAt as string | undefined);

  if (data.error) {
    return (
      <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 text-xs text-text-tertiary">
        Couldn&apos;t save the photo. Try sending it again.
      </div>
    );
  }

  const totalCount = data.totalCount as number | undefined;
  const id = data.id as string | undefined;
  const imageUrl = data.imageUrl as string | undefined;

  const handleDateUpdate = async (newDate: string) => {
    setDate(newDate);
    if (id) {
      await fetch("/api/progress-photos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, capturedAt: newDate }),
      });
    }
  };

  return (
    <div className="rounded-radius-lg border border-semantic-success/30 bg-semantic-success-muted border-l-[3px] border-l-semantic-success px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera size={13} className="text-semantic-success" />
          <span className="text-sm font-medium text-semantic-success">
            Progress photo saved
          </span>
        </div>
        {totalCount != null && (
          <span className="rounded-full bg-semantic-success/15 px-2 py-0.5 text-xs font-medium text-semantic-success">
            #{totalCount}
          </span>
        )}
      </div>
      {date && (
        <div className="mt-1.5 pl-[21px]">
          <EditableDate date={date} onUpdate={handleDateUpdate} />
        </div>
      )}
      {imageUrl ? (
        <div className="mt-3 pl-[21px]">
          <PhotoShareButton
            imageUrl={imageUrl}
            filename={`huuman-progress-photo-${date ?? "today"}.jpg`}
            label="Share photo"
          />
        </div>
      ) : null}
    </div>
  );
}

function SavedMealCard({ data }: { data: Record<string, unknown> }) {
  const [date, setDate] = useState(data.capturedAt as string | undefined);
  const [mt, setMt] = useState((data.mealType as string | null) ?? null);

  if (data.error) {
    return (
      <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 text-xs text-text-tertiary">
        Couldn&apos;t log the meal. Try sending the photo again.
      </div>
    );
  }

  const description = data.description as string | undefined;
  const cal = data.estimatedCalories as number | undefined;
  const protein = data.estimatedProteinG as number | undefined;
  const id = data.id as string | undefined;
  const imageUrl = data.imageUrl as string | undefined;

  const patchMeal = async (fields: Record<string, unknown>) => {
    if (!id) return;
    await fetch("/api/meal-photos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...fields }),
    });
  };

  return (
    <div className="rounded-radius-lg border border-domain-nutrition/30 bg-domain-nutrition-muted border-l-[3px] border-l-domain-nutrition px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils size={13} className="text-domain-nutrition" />
          <span className="text-sm font-medium text-domain-nutrition">
            Meal logged
          </span>
        </div>
        <EditableMealType
          value={mt}
          onUpdate={(v) => {
            setMt(v);
            patchMeal({ mealType: v });
          }}
        />
      </div>
      {description && (
        <p className="text-xs text-text-tertiary line-clamp-2 leading-relaxed">
          {description}
        </p>
      )}
      <div className="flex items-center justify-between">
        {cal != null || protein != null ? (
          <div className="flex gap-2">
            {cal != null && (
              <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-text-muted">
                ~{cal} cal
              </span>
            )}
            {protein != null && (
              <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-xs text-text-muted">
                ~{protein}g protein
              </span>
            )}
          </div>
        ) : (
          <div />
        )}
        {date && (
          <EditableDate
            date={date}
            onUpdate={(d) => {
              setDate(d);
              patchMeal({ capturedAt: d });
            }}
          />
        )}
      </div>
      {imageUrl ? (
        <div>
          <PhotoShareButton
            imageUrl={imageUrl}
            filename={`huuman-meal-photo-${date ?? "today"}.jpg`}
            label="Share photo"
          />
        </div>
      ) : null}
    </div>
  );
}

function WeightLogCard({ data }: { data: Record<string, unknown> }) {
  if (data.error) {
    return (
      <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 text-xs text-text-tertiary">
        Couldn&apos;t log weight right now. Try again in a moment.
      </div>
    );
  }

  const entry = data.entry as Record<string, unknown> | undefined;
  if (!entry) return null;

  const weightKg = Number(entry.weight_kg);
  const deltaKg = data.deltaKg as number | null;
  const date = entry.date as string | undefined;

  return (
    <div className="rounded-radius-lg border border-border-default bg-surface-raised overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-radius-sm bg-semantic-info/10">
          <Scale size={14} className="text-semantic-info" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold leading-tight text-text-primary">
            {weightKg}{" "}
            <span className="text-sm font-normal text-text-muted">kg</span>
          </p>
          {date && (
            <p className="mt-0.5 text-xs text-text-muted">
              {new Date(date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
          )}
        </div>

        {deltaKg != null && deltaKg !== 0 && (
          <span
            className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-bold ${
              deltaKg < 0
                ? "border-semantic-success/30 bg-semantic-success/10 text-semantic-success"
                : "border-semantic-warning/30 bg-semantic-warning/10 text-semantic-warning"
            }`}
          >
            {deltaKg > 0 ? "+" : ""}
            {deltaKg} kg
          </span>
        )}
      </div>
    </div>
  );
}
