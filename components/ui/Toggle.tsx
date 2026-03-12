"use client";

import * as Switch from "@radix-ui/react-switch";
import { haptics } from "@/lib/haptics";

interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function Toggle({
  checked,
  onCheckedChange,
  disabled = false,
  label,
  className = "",
}: ToggleProps) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={(val) => {
        haptics.light();
        onCheckedChange(val);
      }}
      disabled={disabled}
      aria-label={label}
      className={`relative h-[31px] w-[51px] shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-border-strong focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base ${
        checked ? "bg-semantic-success" : "bg-surface-elevated"
      } ${className}`}
    >
      <Switch.Thumb className="block h-[27px] w-[27px] translate-x-[2px] rounded-full bg-white shadow-sm transition-transform duration-200 will-change-transform data-[state=checked]:translate-x-[22px]" />
    </Switch.Root>
  );
}
