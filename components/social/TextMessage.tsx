"use client";

import type { SocialMessage } from "@/lib/types";

interface TextMessageProps {
  message: SocialMessage;
  isOwn: boolean;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function TextMessage({ message, isOwn }: TextMessageProps) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 ${
          isOwn
            ? "rounded-br-md bg-zinc-800 text-zinc-100"
            : "rounded-bl-md bg-zinc-900 border border-zinc-800 text-zinc-200"
        }`}
      >
        {!isOwn && message.sender?.displayName && (
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">
            {message.sender.displayName}
          </p>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <p className={`text-[10px] mt-1 ${isOwn ? "text-zinc-500 text-right" : "text-zinc-600"}`}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
