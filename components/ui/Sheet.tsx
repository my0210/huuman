"use client";

import { Drawer } from "vaul";
import { haptics } from "@/lib/haptics";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "./IconButton";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  snapPoints?: (string | number)[];
}

export function Sheet({ open, onOpenChange, children, snapPoints }: SheetProps) {
  return (
    <Drawer.Root
      open={open}
      onOpenChange={(val) => {
        if (val) haptics.medium();
        onOpenChange(val);
      }}
      snapPoints={snapPoints}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-2xl border-t border-x border-border-default bg-surface-overlay outline-none">
          <div className="flex justify-center py-3">
            <Drawer.Handle className="h-1.5 w-12 rounded-full bg-surface-elevated" />
          </div>
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function SheetHeader({
  title,
  onClose,
  rightAction,
  children,
  className = "",
}: {
  title?: ReactNode;
  onClose?: () => void;
  rightAction?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  if (children) {
    return (
      <div className={`px-4 py-2 border-b border-border-subtle ${className}`}>
        {children}
      </div>
    );
  }
  return (
    <div
      className={`flex items-center justify-between px-4 py-2 border-b border-border-subtle ${className}`}
    >
      <Drawer.Title className="text-sm font-semibold text-text-primary truncate">
        {title}
      </Drawer.Title>
      <div className="flex items-center gap-3">
        {rightAction}
        {onClose && (
          <IconButton label="Close" size="sm" onClick={onClose}>
            <X size={16} />
          </IconButton>
        )}
      </div>
    </div>
  );
}

function SheetBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex-1 overflow-y-auto scrollbar-none ${className}`}>
      {children}
    </div>
  );
}

function SheetFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-4 pt-3 border-t border-border-subtle safe-bottom ${className}`}
    >
      {children}
    </div>
  );
}

Sheet.Header = SheetHeader;
Sheet.Body = SheetBody;
Sheet.Footer = SheetFooter;
