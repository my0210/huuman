"use client";

import { haptics } from "@/lib/haptics";
import type { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  pressable?: boolean;
}

export function Card({
  pressable = false,
  className = "",
  onClick,
  children,
  ...props
}: CardProps) {
  return (
    <div
      onClick={(e) => {
        if (pressable) haptics.light();
        onClick?.(e);
      }}
      className={`rounded-radius-lg border border-border-default bg-surface-raised overflow-hidden ${
        pressable
          ? "cursor-pointer active:scale-[0.99] transition-transform duration-100"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
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
    <div className={`px-4 py-3 border-t border-border-subtle ${className}`}>
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;
