"use client";

import { useState, useRef } from "react";
import { Reply, Copy, Trash2, X } from "lucide-react";
import type { SocialMessage } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import ReactionRow from "./ReactionRow";

interface PhotoMessageProps {
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

export default function PhotoMessage({ message, isOwn, isFirstInGroup, isLastInGroup, onReact, onReply, onDelete, onCopy, readCount = 0, replyContent, onReplyTap, activeActionId, onActionOpen }: PhotoMessageProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showActions = activeActionId === message.id;

  const handlePointerDown = () => {
    longPressRef.current = setTimeout(() => onActionOpen?.(message.id), 500);
  };
  const handlePointerUp = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = null;
  };
  const closeActions = () => onActionOpen?.(null);

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
          className={`rounded-2xl overflow-hidden ${
            isOwn
              ? `bg-surface-overlay ${isLastInGroup ? "rounded-br-md" : ""}`
              : `bg-surface-raised border border-border-default ${isLastInGroup ? "rounded-bl-md" : ""}`
          }`}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {replyContent && (
            <button
              type="button"
              onClick={onReplyTap}
              className="w-full border-l-2 border-text-tertiary pl-2 pr-3 pt-2 mb-1.5 text-left"
            >
              <p className="text-[10px] font-medium text-text-tertiary truncate">{replyContent.sender || "Message"}</p>
              <p className="text-[11px] text-text-muted truncate">{replyContent.content}</p>
            </button>
          )}
          {message.mediaUrl && (
            <img
              src={message.mediaUrl}
              alt="Photo"
              className="w-full max-h-72 object-cover cursor-pointer"
              loading="lazy"
              onClick={() => setLightboxOpen(true)}
            />
          )}
          {message.content && (
            <p className="text-sm text-text-primary px-3 py-1.5 whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
          {isLastInGroup && (
            <div className={`flex items-center gap-1 px-3 pb-2 ${isOwn ? "justify-end" : ""}`}>
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
            {onCopy && message.content && (
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

      {lightboxOpen && message.mediaUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            className="absolute top-6 right-6 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white active:bg-white/30 transition-colors"
          >
            <X size={24} />
          </button>
          <img
            src={message.mediaUrl}
            alt="Photo fullscreen"
            className="max-w-[95vw] max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
