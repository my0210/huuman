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
    "bg-text-primary text-surface-base font-medium",
  secondary:
    "bg-surface-raised border border-border-default text-text-secondary",
  ghost: "text-text-secondary",
  danger:
    "bg-semantic-error/10 border border-semantic-error/20 text-semantic-error",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-radius-sm",
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
      <motion.button
        ref={ref}
        whileTap={disabled ? undefined : press.button}
        transition={spring.snappy}
        onClick={(e) => {
          if (!disabled) haptics.medium();
          onClick?.(e);
        }}
        disabled={disabled}
        className={`${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? "w-full" : ""} inline-flex items-center justify-center transition-opacity disabled:opacity-40 ${className}`}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);
