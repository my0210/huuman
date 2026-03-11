"use client";

import { Sheet } from "@/components/ui/Sheet";
import { ArrowLeft } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Legacy wrapper around Sheet (Vaul). New code should use <Sheet> directly.
 */
export function Drawer({
  open,
  onClose,
  title,
  onBack,
  rightAction,
  children,
}: DrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <IconButton size="sm" label="Back" onClick={onBack}>
                <ArrowLeft size={16} />
              </IconButton>
            )}
            <h2 className="text-sm font-semibold text-text-primary truncate">
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {rightAction}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {children}
      </div>
    </Sheet>
  );
}
