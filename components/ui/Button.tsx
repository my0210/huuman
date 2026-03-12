"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { haptics } from "@/lib/haptics";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-white text-black",
  secondary: "bg-surface-raised border border-border-default text-text-primary",
  ghost: "text-text-secondary",
  danger: "bg-semantic-error-muted text-semantic-error",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-sm rounded-radius-sm",
  md: "px-4 py-2.5 text-sm rounded-radius-md",
  lg: "px-5 py-3 text-base rounded-radius-md",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      fullWidth = false,
      className = "",
      onClick,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        onClick={(e) => {
          if (!disabled) haptics.medium();
          onClick?.(e);
        }}
        disabled={disabled}
        className={`${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} min-h-[44px] inline-flex items-center justify-center gap-2 font-medium active:scale-[0.97] active:brightness-110 transition-[transform,filter] duration-100 disabled:opacity-40 disabled:active:scale-100 disabled:active:brightness-100 ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);
