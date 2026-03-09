"use client";

import { Utensils } from "lucide-react";
import type { SocialMessage, MealCardDetail } from "@/lib/types";
import ReactionRow from "./ReactionRow";

interface MealCardMessageProps {
  message: SocialMessage;
  onReact: (emoji: string) => void;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function MealCardMessage({ message, onReact }: MealCardMessageProps) {
  const detail = message.detail as MealCardDetail | undefined;
  if (!detail) return null;

  return (
    <div className="max-w-[85%]">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-400/10">
            <Utensils size={12} className="text-green-400" />
          </div>
          <span className="text-sm font-semibold text-zinc-200">Meal</span>
          {detail.oneLine && (
            <span className="text-xs text-zinc-500 truncate">— {detail.oneLine}</span>
          )}
        </div>

        {/* Photo */}
        {detail.photoUrl && (
          <img
            src={detail.photoUrl}
            alt="Meal"
            className="w-full max-h-48 object-cover"
            loading="lazy"
          />
        )}

        {/* Content */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
            {detail.calories != null && (
              <span>
                <span className="text-green-400 font-medium">{detail.calories}</span> kcal
              </span>
            )}
            {detail.proteinG != null && (
              <span>
                <span className="text-green-400 font-medium">{detail.proteinG}g</span> protein
              </span>
            )}
          </div>

          {detail.assessment && (
            <p className="text-xs text-zinc-400">{detail.assessment}</p>
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
