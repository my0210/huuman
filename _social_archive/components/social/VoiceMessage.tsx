"use client";

import { useState, useRef, useCallback } from "react";
import { Play, Pause, Reply, Copy, Trash2 } from "lucide-react";
import type { SocialMessage } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import ReactionRow from "./ReactionRow";

interface VoiceMessageProps {
  message: SocialMessage;
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  onReact: (emoji: string) => void;
  onReply?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  readCount?: number;
  replyContent?: { sender?: string; content: string };
  onReplyTap?: () => void;
  activeActionId?: string | null;
  onActionOpen?: (id: string | null) => void;
}

function ReadStatus({ messageId, readCount = 0 }: { messageId: string; readCount?: number }) {
  const isSending = messageId.startsWith("temp-");
  const isRead = readCount > 0;

  if (isSending) {
    return (
      <svg width="16" height="11" viewBox="0 0 16 11" className="text-text-muted flex-none">
        <path d="M11 1L5.5 8L3 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }

  return (
    <svg width="16" height="11" viewBox="0 0 16 11" className={`flex-none ${isRead ? "text-semantic-info" : "text-text-muted"}`}>
      <path d="M8.5 1L3 8L0.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M14 1L8.5 8L7 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(ms?: number) {
  if (!ms) return "0:00";
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceMessage({ message, isOwn, isFirstInGroup, isLastInGroup, onReact, onReply, onDelete, onCopy, readCount = 0, replyContent, onReplyTap, activeActionId, onActionOpen }: VoiceMessageProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const showActions = activeActionId === message.id;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = () => {
    longPressRef.current = setTimeout(() => onActionOpen?.(message.id), 500);
  };
  const handlePointerUp = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = null;
  };
  const closeActions = () => onActionOpen?.(null);

  const tick = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      setProgress(audio.currentTime / audio.duration);
    }
    if (playing) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [playing]);

  const toggle = () => {
    if (!audioRef.current) {
      const audio = new Audio(message.mediaUrl ?? "");
      audio.addEventListener("ended", () => {
        setPlaying(false);
        setProgress(0);
        cancelAnimationFrame(rafRef.current);
      });
      audioRef.current = audio;
    }

    const audio = audioRef.current;
    if (playing) {
      audio.pause();
      cancelAnimationFrame(rafRef.current);
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      {!isOwn && (
        <div className="w-7 flex-none flex items-end mr-2">
          {isLastInGroup && (
            <Avatar name={message.sender?.displayName} size="sm" />
          )}
        </div>
      )}
      <div className="flex flex-col max-w-[70%]">
        <div
          className={`rounded-2xl px-3 py-2 select-none ${
            isOwn
              ? `bg-surface-overlay ${isLastInGroup ? "rounded-br-md" : ""}`
              : `bg-surface-raised border border-border-default ${isLastInGroup ? "rounded-bl-md" : ""}`
          }`}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          {replyContent && (
            <button type="button" onClick={onReplyTap} className="w-full border-l-2 border-text-tertiary pl-2 mb-1.5 text-left">
              <p className="text-[10px] font-medium text-text-tertiary truncate">{replyContent.sender || "Message"}</p>
              <p className="text-[11px] text-text-muted truncate">{replyContent.content}</p>
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggle}
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-surface-elevated text-text-primary active:opacity-80 transition-colors"
            >
              {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
            <div className="relative flex-1 h-6 flex items-center gap-[2px]">
              {Array.from({ length: 24 }).map((_, i) => {
                const h = 30 + Math.sin(i * 0.7) * 40 + Math.cos(i * 1.3) * 30;
                const filled = i / 24 <= progress;
                return (
                  <div
                    key={i}
                    className={`w-[3px] rounded-full transition-colors ${
                      filled ? "bg-text-secondary" : "bg-surface-elevated"
                    }`}
                    style={{ height: `${Math.max(15, Math.min(100, h))}%` }}
                  />
                );
              })}
            </div>
            <span className="text-[10px] text-text-tertiary flex-none tabular-nums">
              {formatDuration(message.mediaDurationMs)}
            </span>
          </div>
          {isLastInGroup && (
            <div className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : ""}`}>
              <span className={`text-[10px] ${isOwn ? "text-text-tertiary" : "text-text-muted"}`}>
                {formatTime(message.createdAt)}
              </span>
              {isOwn && <ReadStatus messageId={message.id} readCount={readCount} />}
            </div>
          )}
        </div>
        {isLastInGroup && (
          <ReactionRow messageId={message.id} reactions={message.reactions ?? []} onReact={onReact} />
        )}
      </div>
      {showActions && (
        <div className="fixed inset-0 z-[60]" onClick={closeActions}>
          <div
            className={`absolute ${isOwn ? "right-4" : "left-12"} bg-surface-overlay border border-border-default rounded-radius-lg shadow-lg overflow-hidden`}
            style={{ bottom: "auto", top: "50%" }}
            onClick={(e) => e.stopPropagation()}
          >
            {onReply && (
              <button onClick={() => { onReply(); closeActions(); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-text-primary active:bg-surface-elevated">
                <Reply size={16} className="text-text-tertiary" /> Reply
              </button>
            )}
            {onCopy && (
              <button onClick={() => { onCopy(); closeActions(); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-text-primary active:bg-surface-elevated border-t border-border-subtle">
                <Copy size={16} className="text-text-tertiary" /> Copy
              </button>
            )}
            {onDelete && (
              <button onClick={() => { onDelete(); closeActions(); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-semantic-error active:bg-surface-elevated border-t border-border-subtle">
                <Trash2 size={16} /> Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
