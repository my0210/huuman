"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

export function Drawer({
  open,
  onClose,
  title,
  onBack,
  rightAction,
  children,
}: DrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="relative w-full max-w-lg rounded-t-2xl border-t border-x border-zinc-800 bg-zinc-950 flex flex-col"
            style={{ maxHeight: "90dvh" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
          >
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-zinc-700" />
            </div>

            {title && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/50">
                <div className="flex items-center gap-2 min-w-0">
                  {onBack && (
                    <button
                      onClick={onBack}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <ArrowLeft size={16} />
                    </button>
                  )}
                  <h2 className="text-sm font-semibold text-zinc-100 truncate">
                    {title}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  {rightAction}
                  {!onBack && (
                    <button
                      onClick={onClose}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto scrollbar-none">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
