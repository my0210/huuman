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
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm hover:bg-zinc-800 transition-colors"
          >
            {emoji}
          </button>
        ))}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
        >
          <Plus size={14} />
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
            className="w-16 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-center text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
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
                  ? "border border-zinc-600 bg-zinc-800 text-zinc-200"
                  : "border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
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
