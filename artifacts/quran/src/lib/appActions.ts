import { toast } from "sonner";
import { APP_CONFIG, getCapacitorPlatform, isCapacitorNative } from "./appConfig";

// "Share app" and "Rate app", moved unchanged from the old Settings screen.

export async function shareApp() {
  const { shareTitle, shareText, website } = APP_CONFIG;
  if (navigator.share) {
    try {
      await navigator.share({ title: shareTitle, text: shareText, url: website });
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(website);
    toast.success("تم نسخ رابط التطبيق");
  } catch {
    toast.error("تعذّر النسخ");
  }
}

export function rateApp() {
  const platform = getCapacitorPlatform();
  if (platform === "ios" && APP_CONFIG.iosAppStoreUrl) {
    window.open(APP_CONFIG.iosAppStoreUrl, "_blank");
  } else if (platform === "android" && APP_CONFIG.androidPlayStoreUrl) {
    window.open(APP_CONFIG.androidPlayStoreUrl, "_blank");
  } else if (isCapacitorNative()) {
    toast.info("سيكون التقييم متاحاً بعد نشر التطبيق في المتجر قريباً");
  } else {
    window.open(APP_CONFIG.website, "_blank");
  }
}
