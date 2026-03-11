"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { spring, press } from "@/lib/motion";
import { haptics } from "@/lib/haptics";
import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--phase-accent)]/20 border border-[var(--phase-accent)]/40 text-text-primary font-medium backdrop-blur-md shadow-[0_0_15px_var(--phase-accent)/10]",
  secondary:
    "bg-[var(--phase-glass)] border border-[var(--phase-border)] text-text-secondary backdrop-blur-md",
  ghost: "text-text-secondary hover:bg-[var(--phase-glass)]",
  danger:
    "bg-semantic-error/10 border border-semantic-error/20 text-semantic-error backdrop-blur-md",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-sm rounded-radius-sm min-h-[44px]",
  md: "px-4 py-3 text-sm rounded-radius-md min-h-[44px]",
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
      <motion.button
        ref={ref}
        whileTap={disabled ? undefined : press.button}
        transition={spring.snappy}
        onClick={(e) => {
          if (!disabled) haptics.medium();
          onClick?.(e);
        }}
        disabled={disabled}
        className={`${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} inline-flex items-center justify-center active:brightness-110 transition-opacity disabled:opacity-40 ${className}`}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);
