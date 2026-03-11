import type { Transition, TargetAndTransition } from "framer-motion";

export const spring = {
  snappy: { type: "spring", stiffness: 520, damping: 32 } as Transition,
  smooth: { type: "spring", stiffness: 300, damping: 28 } as Transition,
  bouncy: { type: "spring", stiffness: 400, damping: 22 } as Transition,
} as const;

export const press = {
  button: { scale: 0.97 } as TargetAndTransition,
  card: { scale: 0.99 } as TargetAndTransition,
  compact: { scale: 0.95 } as TargetAndTransition,
  icon: { scale: 0.92 } as TargetAndTransition,
} as const;

export const transition = {
  fade: { duration: 0.15, ease: "easeOut" } as Transition,
  slide: { ...spring.smooth } as Transition,
  expand: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } as Transition,
} as const;

export const stagger = {
  fast: { staggerChildren: 0.03 },
  normal: { staggerChildren: 0.05 },
  slow: { staggerChildren: 0.08 },
} as const;

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: transition.fade,
} as const;

export const slideUp = {
  initial: { y: "100%" },
  animate: { y: 0 },
  exit: { y: "100%" },
  transition: spring.smooth,
} as const;
