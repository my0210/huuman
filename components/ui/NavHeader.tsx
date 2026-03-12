"use client";

import { ChevronLeft } from "lucide-react";
import { haptics } from "@/lib/haptics";

interface NavHeaderProps {
  title: string;
  onBack: () => void;
  rightAction?: React.ReactNode;
}

export function NavHeader({ title, onBack, rightAction }: NavHeaderProps) {
  return (
    <header className="flex-none flex items-center gap-2 border-b border-border-subtle px-4 min-h-[44px] safe-top">
      <button
        onClick={() => {
          haptics.light();
          onBack();
        }}
        className="flex items-center gap-0.5 -ml-1 py-3 pr-2 text-text-secondary active:opacity-70 transition-opacity"
      >
        <ChevronLeft size={20} />
        <span className="text-sm">Back</span>
      </button>
      <h1 className="flex-1 text-sm font-semibold text-text-primary truncate text-center">
        {title}
      </h1>
      <div className="flex items-center gap-2 min-w-[60px] justify-end">
        {rightAction}
      </div>
    </header>
  );
}
