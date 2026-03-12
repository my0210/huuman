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
  success: "bg-semantic-success-muted text-semantic-success",
  warning: "bg-semantic-warning-muted text-semantic-warning",
  error: "bg-semantic-error-muted text-semantic-error",
};

export function Badge({
  variant = "default",
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`${variantClasses[variant]} inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}
