"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { spring, press } from "@/lib/motion";
import { haptics } from "@/lib/haptics";
import { forwardRef } from "react";

type IconButtonSize = "sm" | "md" | "lg";

interface IconButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  size?: IconButtonSize;
  label: string;
}

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "h-9 w-9 min-h-[44px] min-w-[44px] rounded-radius-sm",
  md: "h-11 w-11 rounded-radius-md",
  lg: "h-12 w-12 rounded-radius-md",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { size = "md", label, className = "", onClick, disabled, children, ...props },
    ref,
  ) {
    return (
      <motion.button
        ref={ref}
        aria-label={label}
        whileTap={disabled ? undefined : press.icon}
        transition={spring.snappy}
        onClick={(e) => {
          if (!disabled) haptics.light();
          onClick?.(e);
        }}
        disabled={disabled}
        className={`${sizeClasses[size]} flex items-center justify-center text-text-tertiary active:text-text-secondary active:brightness-125 transition-colors disabled:opacity-40 ${className}`}
        {...props}
      >
        {children}
      </motion.button>
    );
  },
);
