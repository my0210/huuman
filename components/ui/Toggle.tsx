"use client";

import * as Switch from "@radix-ui/react-switch";
import { haptics } from "@/lib/haptics";

interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Toggle({
  checked,
  onCheckedChange,
  disabled = false,
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
      className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "bg-semantic-success" : "bg-surface-elevated"
      } ${className}`}
    >
      <Switch.Thumb className="block h-5.5 w-5.5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 will-change-transform data-[state=checked]:translate-x-[22px]" />
    </Switch.Root>
  );
}
