"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CalendarDays, Sliders, TrendingUp, ClipboardList } from "lucide-react";

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
    color: "text-zinc-300",
  },
  {
    id: "week",
    label: "This week",
    message: "Show me my week",
    icon: CalendarDays,
    color: "text-zinc-300",
  },
  {
    id: "adjust",
    label: "Adjust my plan",
    message: "I want to adjust my plan for the rest of the week",
    icon: Sliders,
    color: "text-zinc-300",
  },
  {
    id: "progress",
    label: "Progress",
    message: "How am I doing this week?",
    icon: TrendingUp,
    color: "text-zinc-300",
  },
  {
    id: "log",
    label: "Log",
    message: "I want to log my habits",
    icon: ClipboardList,
    color: "text-zinc-300",
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
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden z-40 relative"
          >
            <div className="grid grid-cols-3 gap-2 px-4 py-4 bg-zinc-900/95 border-t border-zinc-800">
              {commands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => {
                      onSelect(cmd.message);
                      onClose();
                    }}
                    className="flex flex-col items-center gap-2 rounded-xl py-3 px-2 hover:bg-zinc-800/60 active:bg-zinc-800 transition-colors"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700/50">
                      <Icon size={18} className={cmd.color} />
                    </div>
                    <span className="text-[11px] font-medium text-zinc-400 leading-tight text-center">
                      {cmd.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
