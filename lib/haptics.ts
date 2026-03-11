type HapticStyle = "light" | "medium" | "heavy";

const WEB_PATTERNS: Record<HapticStyle, number> = {
  light: 10,
  medium: 20,
  heavy: 40,
};

/**
 * True when the platform supports programmatic vibration.
 * iOS Safari does NOT support the Vibration API, so all haptics calls
 * are silent there. Components should provide visual press feedback
 * (whileTap scale + brightness) to compensate.
 */
export const canVibrate =
  typeof navigator !== "undefined" && "vibrate" in navigator;

function vibrate(pattern: number | number[]) {
  if (canVibrate) {
    navigator.vibrate(pattern);
  }
}

function impact(style: HapticStyle) {
  vibrate(WEB_PATTERNS[style]);
}

function notification(type: "success" | "warning" | "error") {
  vibrate(type === "success" ? [20, 50, 20] : 30);
}

export const haptics = {
  light: () => impact("light"),
  medium: () => impact("medium"),
  heavy: () => impact("heavy"),
  success: () => notification("success"),
  warning: () => notification("warning"),
  error: () => notification("error"),
  selection: () => impact("light"),
};
