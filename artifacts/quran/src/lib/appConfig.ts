export const APP_CONFIG = {
  website: "https://quran.yahya.app",
  iosAppStoreUrl: "",
  androidPlayStoreUrl: "",
  shareTitle: "مصحفك",
  shareText: "مصحفك معك: القرآن الكريم والأذكار ومواقيت الصلاة. حمّل تطبيق مصحفك",
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
