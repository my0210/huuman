"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { haptics } from "@/lib/haptics";

type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: IconButtonSize;
  label: string;
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "h-9 w-9 rounded-radius-sm",
  md: "h-11 w-11 rounded-radius-md",
  lg: "h-12 w-12 rounded-radius-md",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { size = "md", label, className = "", onClick, disabled, children, ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        aria-label={label}
        onClick={(e) => {
          if (!disabled) haptics.light();
          onClick?.(e);
        }}
        disabled={disabled}
        className={`${sizeClasses[size]} min-h-[44px] min-w-[44px] flex items-center justify-center text-text-tertiary active:text-text-secondary active:brightness-125 transition-[color,filter] duration-100 disabled:opacity-40 disabled:active:brightness-100 ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);
