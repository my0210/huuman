"use client";

import { forwardRef, useRef, useEffect, type TextareaHTMLAttributes, type InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  fullWidth?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ fullWidth = true, className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`${fullWidth ? "w-full" : ""} rounded-radius-md border border-border-default bg-surface-raised px-4 py-2.5 text-[15px] text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none transition-colors ${className}`}
        {...props}
      />
    );
  },
);

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  autoGrow?: boolean;
  maxRows?: number;
};

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
    { autoGrow = true, maxRows = 6, className = "", onChange, ...props },
    ref,
  ) {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;

    useEffect(() => {
      if (autoGrow && textareaRef.current) {
        const el = textareaRef.current;
        el.style.height = "auto";
        const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 22;
        const maxHeight = lineHeight * maxRows;
        el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
      }
    });

    return (
      <textarea
        ref={textareaRef}
        onChange={(e) => {
          if (autoGrow && textareaRef.current) {
            const el = textareaRef.current;
            el.style.height = "auto";
            const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 22;
            const maxHeight = lineHeight * maxRows;
            el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
          }
          onChange?.(e);
        }}
        rows={1}
        className={`w-full resize-none rounded-radius-md border border-border-default bg-surface-raised px-4 py-2.5 text-[15px] text-text-primary placeholder:text-text-muted focus:border-border-strong focus:outline-none transition-colors ${className}`}
        {...props}
      />
    );
  },
);
