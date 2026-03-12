import type { Domain } from "./types";

export const domainStyle: Record<
  Domain,
  { text: string; bg: string; bright: string; border: string }
> = {
  cardio: {
    text: "text-domain-cardio",
    bg: "bg-domain-cardio-muted",
    bright: "text-domain-cardio-bright",
    border: "border-domain-cardio/30",
  },
  strength: {
    text: "text-domain-strength",
    bg: "bg-domain-strength-muted",
    bright: "text-domain-strength-bright",
    border: "border-domain-strength/30",
  },
  mindfulness: {
    text: "text-domain-mindfulness",
    bg: "bg-domain-mindfulness-muted",
    bright: "text-domain-mindfulness-bright",
    border: "border-domain-mindfulness/30",
  },
  nutrition: {
    text: "text-domain-nutrition",
    bg: "bg-domain-nutrition-muted",
    bright: "text-domain-nutrition-bright",
    border: "border-domain-nutrition/30",
  },
  sleep: {
    text: "text-domain-sleep",
    bg: "bg-domain-sleep-muted",
    bright: "text-domain-sleep-bright",
    border: "border-domain-sleep/30",
  },
} as const;
