"use client";

import type { SocialMessage } from "@/lib/types";

interface PhotoMessageProps {
  message: SocialMessage;
  isOwn: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function PhotoMessage({ message, isOwn }: PhotoMessageProps) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-2xl overflow-hidden ${
          isOwn
            ? "rounded-br-md bg-zinc-800"
            : "rounded-bl-md bg-zinc-900 border border-zinc-800"
        }`}
      >
        {!isOwn && message.sender?.displayName && (
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 px-3 pt-2">
            {message.sender.displayName}
          </p>
        )}
        {message.mediaUrl && (
          <img
            src={message.mediaUrl}
            alt="Photo"
            className="w-full max-h-72 object-cover"
            loading="lazy"
          />
        )}
        {message.content && (
          <p className="text-sm text-zinc-200 px-3 py-1.5 whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}
        <p className={`text-[10px] px-3 pb-2 ${isOwn ? "text-zinc-500 text-right" : "text-zinc-600"}`}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
