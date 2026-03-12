"use client";

import { ChevronDown } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface ScrollToBottomProps {
  visible: boolean;
  onClick: () => void;
}

export function ScrollToBottom({ visible, onClick }: ScrollToBottomProps) {
  return (
    <button
      onClick={() => {
        haptics.light();
        onClick();
      }}
      className={`absolute bottom-20 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface-overlay border border-border-default shadow-lg text-text-secondary active:scale-90 transition-[opacity,transform] duration-150 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2 pointer-events-none"
      }`}
      aria-label="Scroll to bottom"
    >
      <ChevronDown size={18} />
    </button>
  );
}
