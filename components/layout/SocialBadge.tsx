"use client";

import { Users } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

interface SocialBadgeProps {
  unreadCount: number;
  onClick: () => void;
}

export default function SocialBadge({ unreadCount, onClick }: SocialBadgeProps) {
  return (
    <div className="relative">
      <IconButton label="Groups" size="sm" onClick={onClick}>
        <Users size={18} />
      </IconButton>
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-semantic-info text-[10px] font-bold text-white flex items-center justify-center px-1 pointer-events-none">
          {unreadCount}
        </span>
      )}
    </div>
  );
}
