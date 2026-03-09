"use client";

import { Users } from "lucide-react";

interface SocialBadgeProps {
  unreadCount: number;
  onClick: () => void;
}

export default function SocialBadge({ unreadCount, onClick }: SocialBadgeProps) {
  return (
    <button
      onClick={onClick}
      className="relative flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
    >
      <Users size={18} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-blue-500 text-[10px] font-bold text-white flex items-center justify-center px-1">
          {unreadCount}
        </span>
      )}
    </button>
  );
}
