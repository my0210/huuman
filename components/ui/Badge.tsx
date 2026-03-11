type BadgeVariant =
  | "default"
  | "cardio"
  | "strength"
  | "mindfulness"
  | "nutrition"
  | "sleep"
  | "success"
  | "warning"
  | "error";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface-elevated text-text-secondary",
  cardio: "bg-domain-cardio-muted text-domain-cardio",
  strength: "bg-domain-strength-muted text-domain-strength",
  mindfulness: "bg-domain-mindfulness-muted text-domain-mindfulness",
  nutrition: "bg-domain-nutrition-muted text-domain-nutrition",
  sleep: "bg-domain-sleep-muted text-domain-sleep",
  success: "bg-semantic-success/15 text-semantic-success",
  warning: "bg-semantic-warning/15 text-semantic-warning",
  error: "bg-semantic-error/15 text-semantic-error",
};

export function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`${variantClasses[variant]} inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}
