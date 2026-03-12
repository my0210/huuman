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
      className={`absolute bottom-20 right-4 z-10 flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border-default bg-surface-overlay text-text-secondary shadow-lg active:scale-[0.97] active:brightness-110 transition-[opacity,transform,filter] duration-150 ${
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
