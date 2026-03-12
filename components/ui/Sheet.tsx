"use client";

import { IonModal } from "@ionic/react";
import { haptics } from "@/lib/haptics";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  snapPoints?: (string | number)[];
}

export function Sheet({
  open,
  onOpenChange,
  children,
}: SheetProps) {
  const modalRef = useRef<HTMLIonModalElement>(null);

  return (
    <IonModal
      ref={modalRef}
      isOpen={open}
      onDidPresent={() => haptics.medium()}
      onDidDismiss={() => onOpenChange(false)}
      initialBreakpoint={0.6}
      breakpoints={[0, 0.4, 0.6, 0.85]}
      handleBehavior="cycle"
      style={{
        "--background": "var(--color-surface-overlay)",
        "--border-radius": "20px",
      } as React.CSSProperties}
    >
      {children}
    </IonModal>
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
      <h2 className="text-lg font-semibold text-text-primary truncate">
        {title}
      </h2>
      <div className="flex items-center gap-3">
        {rightAction}
        {onClose && (
          <button
            aria-label="Close"
            onClick={() => {
              haptics.light();
              onClose();
            }}
            className="flex h-9 w-9 min-h-[44px] min-w-[44px] items-center justify-center text-text-tertiary active:text-text-secondary transition-colors duration-100"
          >
            <X size={16} />
          </button>
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
