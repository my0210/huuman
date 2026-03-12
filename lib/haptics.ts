import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

type HapticStyle = "light" | "medium" | "heavy";

const isNative = Capacitor.isNativePlatform();

const WEB_PATTERNS: Record<HapticStyle, number> = {
  light: 10,
  medium: 20,
  heavy: 40,
};

const NATIVE_IMPACT: Record<HapticStyle, ImpactStyle> = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
};

/**
 * True when the platform supports haptic feedback --
 * either native (Capacitor) or web (Vibration API).
 */
export const canVibrate =
  isNative || (typeof navigator !== "undefined" && "vibrate" in navigator);

function impact(style: HapticStyle) {
  if (isNative) {
    Haptics.impact({ style: NATIVE_IMPACT[style] });
    return;
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(WEB_PATTERNS[style]);
  }
}

function notification(type: "success" | "warning" | "error") {
  if (isNative) {
    const map: Record<string, NotificationType> = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };
    Haptics.notification({ type: map[type] });
    return;
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(type === "success" ? [20, 50, 20] : 30);
  }
}

export const haptics = {
  light: () => impact("light"),
  medium: () => impact("medium"),
  heavy: () => impact("heavy"),
  success: () => notification("success"),
  warning: () => notification("warning"),
  error: () => notification("error"),
  selection: () => {
    if (isNative) {
      Haptics.selectionStart();
      Haptics.selectionChanged();
      Haptics.selectionEnd();
      return;
    }
    impact("light");
  },
};
