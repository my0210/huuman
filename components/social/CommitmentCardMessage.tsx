"use client";

import { useRef } from "react";
import { Clock, Reply, Trash2 } from "lucide-react";
import type { SocialMessage, CommitmentCardDetail, Domain } from "@/lib/types";
import ReactionRow from "./ReactionRow";

const DOMAIN_TW: Record<string, { text: string; bg: string }> = {
  cardio:      { text: "text-domain-cardio",      bg: "bg-domain-cardio-muted" },
  strength:    { text: "text-domain-strength",    bg: "bg-domain-strength-muted" },
  mindfulness: { text: "text-domain-mindfulness",  bg: "bg-domain-mindfulness-muted" },
  nutrition:   { text: "text-domain-nutrition",    bg: "bg-domain-nutrition-muted" },
  sleep:       { text: "text-domain-sleep",        bg: "bg-domain-sleep-muted" },
};

interface CommitmentCardMessageProps {
  message: SocialMessage;
  onReact: (emoji: string) => void;
  onReply?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  isOwn?: boolean;
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

export default function CommitmentCardMessage({ message, onReact, onReply, onDelete, onCopy, isOwn, readCount = 0, replyContent, onReplyTap, activeActionId, onActionOpen }: CommitmentCardMessageProps) {
  const detail = message.detail as CommitmentCardDetail | undefined;
  if (!detail) return null;

  const showActions = activeActionId === message.id;
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeActions = () => onActionOpen?.(null);

  const handlePointerDown = () => {
    longPressRef.current = setTimeout(() => onActionOpen?.(message.id), 500);
  };
  const handlePointerUp = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = null;
  };

  const tw = DOMAIN_TW[detail.domain] ?? DOMAIN_TW.cardio;

  return (
    <div className="max-w-[85%]">
      {showActions && (
        <div className="fixed inset-0 z-[60]" onClick={closeActions}>
          <div
            className="absolute left-4 bg-surface-overlay border border-border-default rounded-radius-lg shadow-lg overflow-hidden"
            style={{ bottom: "auto", top: "50%" }}
            onClick={(e) => e.stopPropagation()}
          >
            {onReply && (
              <button onClick={() => { onReply(); closeActions(); }} className="flex items-center gap-3 w-full px-4 py-3 text-sm text-text-primary active:bg-surface-elevated">
                <Reply size={16} className="text-text-tertiary" /> Reply
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
      <div className="rounded-xl border border-border-default bg-surface-raised overflow-hidden select-none" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onContextMenu={(e) => e.preventDefault()}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-subtle flex items-center gap-2">
          <div className={`flex h-5 w-5 items-center justify-center rounded-full ${tw.bg}`}>
            <Clock size={12} className={tw.text} />
          </div>
          <span className="text-sm font-semibold text-text-primary">{detail.title}</span>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
            {detail.time && <span>{detail.time}</span>}
            {detail.place && <span>{detail.place}</span>}
          </div>

          {detail.sessionPreview && (
            <p className="text-xs text-text-tertiary italic">{detail.sessionPreview}</p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-text-muted">
              {message.sender?.displayName}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-text-muted">{formatTime(message.createdAt)}</span>
              {isOwn && <ReadStatus messageId={message.id} readCount={readCount} />}
            </div>
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
