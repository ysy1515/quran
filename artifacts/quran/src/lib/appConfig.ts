export const APP_CONFIG = {
  website: "https://quran.yahya.app",
  iosAppStoreUrl: "",
  androidPlayStoreUrl: "",
  shareTitle: "القرآن الكريم",
  shareText: "حمّل تطبيق القرآن الكريم - أذان وأذكار ومصحف",
};

export function isCapacitorNative(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.()
  );
}

export function getCapacitorPlatform(): "ios" | "android" | "web" {
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const p = cap?.getPlatform?.();
  if (p === "ios") return "ios";
  if (p === "android") return "android";
  return "web";
}
