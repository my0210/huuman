"use client";

import { useEffect, useRef } from "react";
import { haptics } from "@/lib/haptics";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[--color-overlay] animate-[fadeIn_150ms_ease-out]"
      onClick={(e) => {
        if (e.target === overlayRef.current) onCancel();
      }}
    >
      <div className="mx-6 w-full max-w-[280px] rounded-radius-lg bg-surface-overlay p-6 text-center animate-[scaleIn_150ms_ease-out]">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="mt-2 text-sm text-text-secondary">{message}</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={() => {
              haptics.medium();
              onConfirm();
            }}
            className={`min-h-[44px] w-full rounded-radius-md text-sm font-semibold transition-[transform,filter] duration-100 active:scale-[0.97] active:brightness-110 ${
              destructive
                ? "bg-semantic-error-muted text-semantic-error"
                : "bg-white text-black"
            }`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="min-h-[44px] w-full rounded-radius-md text-sm font-medium text-text-secondary active:bg-surface-elevated transition-colors duration-100"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
