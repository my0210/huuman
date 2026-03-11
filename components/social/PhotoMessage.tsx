"use client";

import { useState, useRef } from "react";
import { X } from "lucide-react";
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

export default function PhotoMessage({ message, isOwn, isFirstInGroup, isLastInGroup, onReact, onReply, onDelete, onCopy, readCount = 0 }: PhotoMessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = () => {
    longPressRef.current = setTimeout(() => setShowActions(true), 500);
  };
  const handlePointerUp = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    longPressRef.current = null;
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
        {showActions && (
          <div className="flex items-center gap-1 mb-1">
            {onReply && (
              <button onClick={() => { onReply(); setShowActions(false); }} className="px-2 py-1 rounded-radius-sm bg-surface-overlay text-xs text-text-secondary active:bg-surface-elevated transition-colors">
                Reply
              </button>
            )}
            {onCopy && (
              <button onClick={() => { onCopy(); setShowActions(false); }} className="px-2 py-1 rounded-radius-sm bg-surface-overlay text-xs text-text-secondary active:bg-surface-elevated transition-colors">
                Copy
              </button>
            )}
            {onDelete && (
              <button onClick={() => { onDelete(); setShowActions(false); }} className="px-2 py-1 rounded-radius-sm bg-surface-overlay text-xs text-semantic-error active:bg-surface-elevated transition-colors">
                Delete
              </button>
            )}
            <button onClick={() => setShowActions(false)} className="px-2 py-1 rounded-radius-sm bg-surface-overlay text-xs text-text-muted active:bg-surface-elevated transition-colors">
              ✕
            </button>
          </div>
        )}
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
          {isFirstInGroup && !isOwn && message.sender?.displayName && (
            <p className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary px-3 pt-2">
              {message.sender.displayName}
            </p>
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
      {lightboxOpen && message.mediaUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-surface-overlay/80 text-text-primary active:bg-surface-elevated transition-colors z-10"
          >
            <X size={20} />
          </button>
          <img
            src={message.mediaUrl}
            alt="Photo fullscreen"
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-radius-md"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
