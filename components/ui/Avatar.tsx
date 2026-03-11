"use client";

const SIZES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-12 w-12 text-lg",
} as const;

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

export function Avatar({ src, name, size = "md", className = "" }: AvatarProps) {
  const sizeClass = SIZES[size];
  const initial = (name || "?").charAt(0).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        className={`${sizeClass} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full bg-surface-elevated font-semibold text-text-secondary ${className}`}
    >
      {initial}
    </div>
  );
}
