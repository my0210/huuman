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
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-500">
        Session not found
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800/50">
        <p className="text-sm font-semibold text-zinc-200">{session.title}</p>
        <p className="text-xs text-zinc-500 capitalize">{session.domain}</p>
      </div>
      <div className="px-4 py-3">
        <SessionDetailInline domain={session.domain} detail={session.detail} />
      </div>
    </div>
  );
}

export function SessionDetailInline({
  domain,
  detail,
}: {
  domain: string;
  detail: Record<string, unknown>;
}) {
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
      return <p className="text-xs text-zinc-500">Unknown session type</p>;
  }
}
