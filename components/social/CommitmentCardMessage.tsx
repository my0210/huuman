"use client";

import { Clock } from "lucide-react";
import type { SocialMessage, CommitmentCardDetail, Domain } from "@/lib/types";
import ReactionRow from "./ReactionRow";

const DOMAIN_TW: Record<string, { text: string; bg: string }> = {
  cardio:      { text: "text-red-400",    bg: "bg-red-400/10" },
  strength:    { text: "text-orange-400",  bg: "bg-orange-400/10" },
  mindfulness: { text: "text-cyan-400",    bg: "bg-cyan-400/10" },
  nutrition:   { text: "text-green-400",   bg: "bg-green-400/10" },
  sleep:       { text: "text-violet-400",  bg: "bg-violet-400/10" },
};

interface CommitmentCardMessageProps {
  message: SocialMessage;
  onReact: (emoji: string) => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function CommitmentCardMessage({ message, onReact }: CommitmentCardMessageProps) {
  const detail = message.detail as CommitmentCardDetail | undefined;
  if (!detail) return null;

  const tw = DOMAIN_TW[detail.domain] ?? DOMAIN_TW.cardio;

  return (
    <div className="max-w-[85%]">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center gap-2">
          <div className={`flex h-5 w-5 items-center justify-center rounded-full ${tw.bg}`}>
            <Clock size={12} className={tw.text} />
          </div>
          <span className="text-sm font-semibold text-zinc-200">{detail.title}</span>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
            {detail.time && <span>{detail.time}</span>}
            {detail.place && <span>{detail.place}</span>}
          </div>

          {detail.sessionPreview && (
            <p className="text-xs text-zinc-500 italic">{detail.sessionPreview}</p>
          )}

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
