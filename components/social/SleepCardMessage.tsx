"use client";

import { Moon } from "lucide-react";
import type { SocialMessage, SleepCardDetail } from "@/lib/types";
import ReactionRow from "./ReactionRow";

interface SleepCardMessageProps {
  message: SocialMessage;
  onReact: (emoji: string) => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const QUALITY_LABELS: Record<number, string> = { 1: "Poor", 2: "Fair", 3: "OK", 4: "Good", 5: "Great" };

export default function SleepCardMessage({ message, onReact }: SleepCardMessageProps) {
  const detail = message.detail as SleepCardDetail | undefined;
  if (!detail) return null;

  return (
    <div className="max-w-[85%]">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-400/10">
            <Moon size={12} className="text-violet-400" />
          </div>
          <span className="text-sm font-semibold text-zinc-200">Sleep</span>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-violet-400 tabular-nums">
              {detail.hours}
            </span>
            <span className="text-xs text-zinc-500">hours</span>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
            {detail.quality && (
              <span>Quality: {QUALITY_LABELS[detail.quality] ?? detail.quality}/5</span>
            )}
            {detail.streak && detail.streak > 1 && (
              <span>{detail.streak}-day streak</span>
            )}
          </div>

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
