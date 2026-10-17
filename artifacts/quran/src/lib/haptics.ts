import { isCapacitorNative } from "./appConfig";

// Light haptic feedback. iOS WKWebView ignores navigator.vibrate, so on device
// this goes through @capacitor/haptics; the web falls back to vibrate().

type HapticsModule = typeof import("@capacitor/haptics");
let mod: Promise<HapticsModule> | null = null;
function load() {
  mod ??= import("@capacitor/haptics");
  return mod;
}

export function hapticTap() {
  if (isCapacitorNative()) {
    load()
      .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
      .catch(() => {});
  } else if ("vibrate" in navigator) {
    navigator.vibrate(15);
  }
}

export function hapticSuccess() {
  if (isCapacitorNative()) {
    load()
      .then(({ Haptics, NotificationType }) => Haptics.notification({ type: NotificationType.Success }))
      .catch(() => {});
  } else if ("vibrate" in navigator) {
    navigator.vibrate([60, 40, 60, 40, 100]);
  }
}
