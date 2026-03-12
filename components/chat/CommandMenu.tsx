"use client";

import {
  Calendar,
  CalendarDays,
  Sliders,
  TrendingUp,
  ClipboardList,
  MessageSquarePlus,
} from "lucide-react";
import { haptics } from "@/lib/haptics";

interface CommandMenuProps {
  open: boolean;
  onSelect: (message: string) => void;
  onClose: () => void;
}

const commands = [
  {
    id: "today",
    label: "Today's plan",
    message: "Show me today's plan",
    icon: Calendar,
  },
  {
    id: "week",
    label: "This week",
    message: "Show me my week",
    icon: CalendarDays,
  },
  {
    id: "adjust",
    label: "Adjust my plan",
    message: "I want to adjust my plan for the rest of the week",
    icon: Sliders,
  },
  {
    id: "progress",
    label: "Progress",
    message: "How am I doing this week?",
    icon: TrendingUp,
  },
  {
    id: "log",
    label: "Log",
    message: "I want to log my day",
    icon: ClipboardList,
  },
  {
    id: "feedback",
    label: "Feedback",
    message: "I want to give feedback about huuman",
    icon: MessageSquarePlus,
  },
];

export function CommandMenu({ open, onSelect, onClose }: CommandMenuProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="z-40 relative border-t border-border-default bg-surface-overlay animate-[fadeIn_150ms_ease-out]">
        <div className="grid grid-cols-3 gap-2 px-4 py-4">
          {commands.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={() => {
                  haptics.light();
                  onSelect(cmd.message);
                  onClose();
                }}
                className="flex flex-col items-center gap-2 rounded-radius-lg py-3 px-2 text-text-secondary active:bg-surface-elevated active:scale-[0.97] transition-[background-color,transform] duration-100"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated border border-border-default">
                  <Icon size={18} className="text-text-secondary" />
                </div>
                <span className="text-xs font-medium text-text-tertiary leading-tight text-center">
                  {cmd.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
