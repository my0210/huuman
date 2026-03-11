type HapticStyle = "light" | "medium" | "heavy";

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

const WEB_PATTERNS: Record<HapticStyle, number> = {
  light: 10,
  medium: 20,
  heavy: 40,
};

async function impact(style: HapticStyle) {
  try {
    // Dynamic import — resolves when @capacitor/haptics is installed, falls back otherwise
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = await (Function('return import("@capacitor/haptics")')() as Promise<{
      Haptics: { impact: (opts: { style: string }) => Promise<void> };
      ImpactStyle: Record<string, string>;
    }>);
    await mod.Haptics.impact({ style: mod.ImpactStyle[style.charAt(0).toUpperCase() + style.slice(1)] });
  } catch {
    vibrate(WEB_PATTERNS[style]);
  }
}

async function notification(type: "success" | "warning" | "error") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = await (Function('return import("@capacitor/haptics")')() as Promise<{
      Haptics: { notification: (opts: { type: string }) => Promise<void> };
      NotificationType: Record<string, string>;
    }>);
    await mod.Haptics.notification({
      type: mod.NotificationType[type.charAt(0).toUpperCase() + type.slice(1)],
    });
  } catch {
    vibrate(type === "success" ? [20, 50, 20] : 30);
  }
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
