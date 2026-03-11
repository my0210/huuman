"use client";

import { useRef } from "react";
import { Reply, Copy, Trash2, X } from "lucide-react";
import type { SocialMessage } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import ReactionRow from "./ReactionRow";

interface TextMessageProps {
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

const URL_REGEX = /(https?:\/\/[^\s<]+)/g;

function renderTextWithLinks(text: string) {
  const parts = text.split(URL_REGEX);
  return parts.map((part, i) => {
    if (part.startsWith("http://") || part.startsWith("https://")) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-semantic-info underline underline-offset-2 break-all"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function TextMessage({ message, isOwn, isFirstInGroup, isLastInGroup, onReact, onReply, onDelete, onCopy, readCount = 0, replyContent, onReplyTap, activeActionId, onActionOpen }: TextMessageProps) {
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
      <div className="flex flex-col max-w-[75%]">
        <div
          className={`rounded-2xl px-3.5 py-2 select-none ${
            isOwn
              ? `bg-surface-overlay text-text-primary ${isLastInGroup ? "rounded-br-md" : ""}`
              : `bg-surface-raised border border-border-default text-text-primary ${isLastInGroup ? "rounded-bl-md" : ""}`
          }`}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          {replyContent && (
            <button
              type="button"
              onClick={onReplyTap}
              className="w-full border-l-2 border-text-tertiary pl-2 mb-1.5 text-left"
            >
              <p className="text-[10px] font-medium text-text-tertiary truncate">{replyContent.sender || "Message"}</p>
              <p className="text-[11px] text-text-muted truncate">{replyContent.content}</p>
            </button>
          )}
          <p className="text-sm whitespace-pre-wrap break-words">{message.content ? renderTextWithLinks(message.content) : null}</p>
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
