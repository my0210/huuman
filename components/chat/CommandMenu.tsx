"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CalendarDays, Sliders, TrendingUp, ClipboardList, MessageSquarePlus } from "lucide-react";
import { transition, press } from "@/lib/motion";

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
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-30"
            onClick={onClose}
          />
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transition.expand}
            className="overflow-hidden z-40 relative"
          >
            <div className="grid grid-cols-3 gap-2 px-4 py-4 bg-surface-overlay/95 border-t border-border-default">
              {commands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <motion.button
                    key={cmd.id}
                    whileTap={press.button}
                    onClick={() => {
                      onSelect(cmd.message);
                      onClose();
                    }}
                    className="flex flex-col items-center gap-2 rounded-radius-lg py-3 px-2 text-text-secondary active:bg-surface-elevated transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-elevated border border-border-default">
                      <Icon size={18} className="text-text-secondary" />
                    </div>
                    <span className="text-[11px] font-medium text-text-tertiary leading-tight text-center">
                      {cmd.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
