"use client";

import { CardioDetail } from "@/components/session/CardioDetail";
import { StrengthDetail } from "@/components/session/StrengthDetail";
import { MindfulnessDetail } from "@/components/session/MindfulnessDetail";
import { NutritionDetail } from "@/components/session/NutritionDetail";
import { SleepDetail } from "@/components/session/SleepDetail";

interface SessionData {
  session: {
    id: string;
    domain: string;
    title: string;
    status: string;
    detail: Record<string, unknown>;
  };
}

export function SessionDetailCard({ data }: { data: Record<string, unknown> }) {
  const { session } = data as unknown as SessionData;

  if (!session) {
    return (
      <div className="rounded-radius-lg border border-border-default bg-surface-raised px-4 py-3 text-xs text-text-muted">
        Couldn&apos;t load this session. Ask me to show your plan instead.
      </div>
    );
  }

  return (
    <div className="rounded-radius-lg border border-border-default bg-surface-raised overflow-hidden">
      <div className="px-4 py-3 border-b border-border-subtle">
        <p className="text-sm font-semibold text-text-primary">{session.title}</p>
        <p className="text-xs text-text-muted capitalize">{session.domain}</p>
      </div>
      <div className="px-4 py-3">
        <SessionDetailInline domain={session.domain} detail={session.detail} />
      </div>
    </div>
  );
}

export function SessionDetailInline({
  domain,
  detail: rawDetail,
}: {
  domain: string;
  detail: Record<string, unknown> | string;
}) {
  let detail: Record<string, unknown>;
  if (typeof rawDetail === 'string') {
    try { detail = JSON.parse(rawDetail); } catch { detail = {}; }
  } else {
    detail = rawDetail ?? {};
  }
  switch (domain) {
    case "cardio":
      return <CardioDetail detail={detail} />;
    case "strength":
      return <StrengthDetail detail={detail} />;
    case "mindfulness":
      return <MindfulnessDetail detail={detail} />;
    case "nutrition":
      return <NutritionDetail detail={detail} />;
    case "sleep":
      return <SleepDetail detail={detail} />;
    default:
      return <p className="text-xs text-text-muted">Unknown session type</p>;
  }
}
