"use client";

import type { SessionCardDetail } from "@/lib/types";
import {
  ShareCanvas,
  getDomainShareStyle,
} from "@/components/share/BrandedShareFrame";

interface WeekProgressItem {
  domain: string;
  label: string;
  completed: number;
  total: number;
}

function getSessionSummary(detail: SessionCardDetail): string[] {
  if (detail.domain === "strength" && detail.exercises?.length) {
    const lines = detail.exercises
      .slice(0, 4)
      .map(
        (exercise) =>
          `${exercise.name}  ${exercise.sets}x${exercise.reps}${exercise.weight ? ` @ ${exercise.weight}` : ""}`,
      );

    if (detail.exercises.length > 4) {
      lines.push(`+${detail.exercises.length - 4} more exercises`);
    }
    return lines;
  }

  if (detail.domain === "cardio") {
    return [
      [detail.durationMinutes != null ? `${detail.durationMinutes} min` : null,
        detail.zone != null ? `Zone ${detail.zone}` : null,
        detail.avgHr != null ? `Avg ${detail.avgHr} bpm` : null]
        .filter(Boolean)
        .join("    "),
    ].filter(Boolean);
  }

  if (detail.domain === "mindfulness") {
    return [
      [detail.mindfulnessType ? capitalize(detail.mindfulnessType) : null,
        detail.durationMinutes != null ? `${detail.durationMinutes} min` : null]
        .filter(Boolean)
        .join("    "),
    ].filter(Boolean);
  }

  return [];
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function SessionShareImage({
  detail,
  weekProgress,
}: {
  detail: SessionCardDetail;
  weekProgress?: WeekProgressItem[];
}) {
  const style = getDomainShareStyle(detail.domain);
  const lines = getSessionSummary(detail);
  const footerItems = [
    ...(detail.isExtra
      ? [
          {
            key: "extra",
            label: "EXTRA SESSION",
            value: "Logged outside your plan",
          },
        ]
      : []),
    ...((weekProgress ?? [])
      .filter((item) => item.total > 0)
      .slice(0, 2)
      .map((item) => ({
        key: item.domain,
        label: item.label.toUpperCase(),
        value: `${item.completed}/${item.total}`,
      }))),
  ];

  return (
    <ShareCanvas chipLabel={style.label} chipClassName={style.chipClassName}>
      <div className="mt-16 flex h-full flex-col">
        <div className="flex items-center gap-3">
          <div className={`h-3.5 w-3.5 rounded-full ${style.accentClassName}`} />
          <div className="rounded-full bg-semantic-success/12 px-4 py-1.5 text-[24px] font-semibold text-semantic-success">
            Completed
          </div>
        </div>

        <div className="mt-10">
          <h1 className="max-w-[800px] text-[78px] font-semibold leading-[0.95] tracking-[-0.04em] text-text-primary">
            {detail.title}
          </h1>
        </div>

        <div className="mt-12 space-y-4">
          {lines.length > 0 ? (
            lines.map((line) => (
              <p
                key={line}
                className="text-[36px] leading-[1.2] tracking-[-0.02em] text-text-secondary"
              >
                {line}
              </p>
            ))
          ) : (
            <p className="text-[34px] leading-[1.25] text-text-secondary">
              Session completed and logged in huuman.
            </p>
          )}
        </div>

        <div className="mt-auto">
          {footerItems.length > 0 ? (
            <div className="mt-10 grid grid-cols-2 gap-4 border-t border-border-default pt-6">
              {footerItems.map((item) => (
                <div
                  key={item.key}
                  className="rounded-radius-lg border border-border-default bg-surface-base/70 px-5 py-4"
                >
                  <div className="text-[20px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
                    {item.label}
                  </div>
                  <div className="mt-2 text-[34px] font-semibold leading-none text-text-primary">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-10 border-t border-border-default pt-6 text-[24px] text-text-tertiary">
              Shared from huuman
            </div>
          )}
        </div>
      </div>
    </ShareCanvas>
  );
}
