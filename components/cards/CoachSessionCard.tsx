"use client";

import { SessionCardContent } from "./SessionCardContent";
import { ShareButton } from "./ShareButton";
import type { SessionCardDetail, SessionDomain } from "@/lib/types";

interface ToolOutput {
  session: {
    id: string;
    domain: string;
    title: string;
    status: string;
    detail?: Record<string, unknown>;
    completedDetail?: Record<string, unknown>;
  };
  weekProgress?: {
    domain: string;
    label: string;
    completed: number;
    total: number;
  }[];
  isExtra?: boolean;
}

function extractDetail(raw: ToolOutput): SessionCardDetail {
  const { session, isExtra } = raw;
  const domain = session.domain as SessionDomain;
  const src = (session.completedDetail ?? session.detail ?? {}) as Record<
    string,
    unknown
  >;

  const detail: SessionCardDetail = {
    sessionId: session.id,
    domain,
    title: session.title,
    isExtra,
  };

  if (domain === "strength" && Array.isArray(src.exercises)) {
    detail.exercises = (src.exercises as Record<string, unknown>[]).map(
      (ex) => {
        const w = ex.targetWeight ?? ex.weight;
        return {
          name: String(ex.name),
          sets: Number(ex.sets),
          reps: String(ex.reps),
          weight: w != null ? String(w) : undefined,
        };
      },
    );
  }

  if (domain === "cardio") {
    detail.durationMinutes = (src.durationMinutes ?? src.targetMinutes) as
      | number
      | undefined;
    detail.zone = src.zone as number | undefined;
    detail.avgHr = src.avgHr as number | undefined;
  }

  if (domain === "mindfulness") {
    detail.mindfulnessType = (src.type ?? src.mindfulnessType) as
      | string
      | undefined;
    detail.durationMinutes = src.durationMinutes as number | undefined;
  }

  return detail;
}

export function CoachSessionCard({
  data,
}: {
  data: Record<string, unknown>;
}) {
  if (data.error) {
    return (
      <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 text-xs text-text-tertiary">
        Couldn&apos;t record that session. Try again in a moment.
      </div>
    );
  }

  const raw = data as unknown as ToolOutput;
  const detail = extractDetail(raw);

  return (
    <div>
      <SessionCardContent detail={detail} weekProgress={raw.weekProgress} />
      <ShareButton
        type="session_card"
        detail={detail}
        weekProgress={raw.weekProgress}
      />
    </div>
  );
}
