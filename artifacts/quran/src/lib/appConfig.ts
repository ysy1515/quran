export const APP_CONFIG = {
  website: "https://quran.yahya.app",
  iosAppStoreUrl: "",
  androidPlayStoreUrl: "",
  /**
   * Public support address, shown as a mailto link on /support and /privacy.
   * Must be a real inbox the operator reads; the contact sections stay hidden while it is empty.
   */
  supportEmail: "support@yahya.app",
  /**
   * Who is responsible for the app, as named in the privacy policy. The public brand only:
   * no personal name, and no company or legal entity unless one is registered. Hidden while empty.
   */
  operatorName: "مطوّر تطبيق مصحفك",
  /** App Store Connect "Support URL" and "Privacy Policy URL". Both pages are served by this web app. */
  supportUrl: "https://quran.yahya.app/support",
  privacyPolicyUrl: "https://quran.yahya.app/privacy",
  /** Date shown as the privacy policy's last update. Change it whenever the policy text changes. */
  privacyPolicyUpdated: "2026-10-23",
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
