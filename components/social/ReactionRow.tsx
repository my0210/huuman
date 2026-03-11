"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { ReactionSummary } from "@/lib/types";
import { REACTION_PRESETS } from "@/lib/types";

interface ReactionRowProps {
  messageId: string;
  reactions: ReactionSummary[];
  onReact: (emoji: string) => void;
}

export default function ReactionRow({ messageId, reactions, onReact }: ReactionRowProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [customEmoji, setCustomEmoji] = useState("");

  const handleCustomSubmit = () => {
    const trimmed = customEmoji.trim();
    if (trimmed) {
      onReact(trimmed);
      setCustomEmoji("");
      setShowPicker(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 pt-2">
      {/* Preset quick-react buttons */}
      <div className="flex items-center gap-1">
        {REACTION_PRESETS.map((emoji) => (
          <button
            key={`${messageId}-preset-${emoji}`}
            onClick={() => onReact(emoji)}
            className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-sm active:bg-surface-elevated transition-colors"
          >
            {emoji}
          </button>
        ))}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-text-tertiary active:bg-surface-elevated active:text-text-secondary transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Custom emoji input */}
      {showPicker && (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={customEmoji}
            onChange={(e) => setCustomEmoji(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
            placeholder="Emoji…"
            maxLength={4}
            className="w-16 rounded-md border border-border-default bg-surface-overlay px-2 py-1 text-center text-sm text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none"
            autoFocus
          />
        </div>
      )}

      {/* Existing reactions as pills */}
      {reactions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {reactions.map((r) => (
            <button
              key={`${messageId}-reaction-${r.emoji}`}
              onClick={() => onReact(r.emoji)}
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
                r.reacted
                  ? "border border-border-strong bg-surface-overlay text-text-primary"
                  : "border border-border-default bg-surface-raised text-text-secondary active:border-border-strong"
              }`}
            >
              <span>{r.emoji}</span>
              <span>{r.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
