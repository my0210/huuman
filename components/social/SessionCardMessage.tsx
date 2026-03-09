"use client";

import { Check } from "lucide-react";
import type { SocialMessage, SessionCardDetail, Domain } from "@/lib/types";
import ReactionRow from "./ReactionRow";

const DOMAIN_TW: Record<string, { text: string; border: string; bg: string }> = {
  cardio:      { text: "text-red-400",    border: "border-red-400/30",    bg: "bg-red-400/10" },
  strength:    { text: "text-orange-400",  border: "border-orange-400/30", bg: "bg-orange-400/10" },
  mindfulness: { text: "text-cyan-400",    border: "border-cyan-400/30",   bg: "bg-cyan-400/10" },
  nutrition:   { text: "text-green-400",   border: "border-green-400/30",  bg: "bg-green-400/10" },
  sleep:       { text: "text-violet-400",  border: "border-violet-400/30", bg: "bg-violet-400/10" },
};

interface SessionCardMessageProps {
  message: SocialMessage;
  onReact: (emoji: string) => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function SessionCardMessage({ message, onReact }: SessionCardMessageProps) {
  const detail = message.detail as SessionCardDetail | undefined;
  if (!detail) return null;

  const tw = DOMAIN_TW[detail.domain] ?? DOMAIN_TW.cardio;

  return (
    <div className="max-w-[85%]">
      <div className={`rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex h-5 w-5 items-center justify-center rounded-full ${tw.bg}`}>
              <Check size={12} className={tw.text} />
            </div>
            <span className="text-sm font-semibold text-zinc-200">{detail.title}</span>
          </div>
          <span className={`text-[10px] font-medium uppercase tracking-wider ${tw.text}`}>
            {detail.domain}
          </span>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-2">
          {/* Stats row */}
          <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
            {detail.durationMinutes && (
              <span>{detail.durationMinutes} min</span>
            )}
            {detail.zone && (
              <span>Zone {detail.zone}</span>
            )}
            {detail.avgHr && (
              <span>{detail.avgHr} bpm avg</span>
            )}
            {detail.mindfulnessType && (
              <span className="capitalize">{detail.mindfulnessType}</span>
            )}
          </div>

          {/* Exercises */}
          {detail.exercises && detail.exercises.length > 0 && (
            <div className="space-y-1">
              {detail.exercises.map((ex, i) => (
                <div key={i} className="flex items-baseline justify-between text-xs">
                  <span className="text-zinc-300">{ex.name}</span>
                  <span className="text-zinc-500">
                    {ex.sets}×{ex.reps}
                    {ex.weight ? ` @ ${ex.weight}` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-zinc-600">
              {message.sender?.displayName}
            </span>
            <span className="text-[10px] text-zinc-600">
              {formatTime(message.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <ReactionRow
        messageId={message.id}
        reactions={message.reactions ?? []}
        onReact={onReact}
      />
    </div>
  );
}
