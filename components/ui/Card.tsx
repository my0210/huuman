"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { spring, press } from "@/lib/motion";
import type { ReactNode } from "react";

interface CardProps extends Omit<HTMLMotionProps<"div">, "ref"> {
  pressable?: boolean;
  glow?: string;
}

export function Card({
  pressable = false,
  glow,
  className = "",
  children,
  style,
  ...props
}: CardProps) {
  return (
    <motion.div
      whileTap={pressable ? press.card : undefined}
      transition={spring.snappy}
      className={`rounded-radius-lg border border-border-default bg-surface-raised ${className}`}
      style={glow ? { boxShadow: glow, ...style } : style}
      {...props}
    >
      {children}
    </motion.div>
  );
}

function CardHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-border-subtle ${className}`}
    >
      {children}
    </div>
  );
}

function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-4 py-3 ${className}`}>{children}</div>;
}

function CardFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`px-4 py-3 border-t border-border-subtle ${className}`}
    >
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
