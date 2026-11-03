import { toast } from "sonner";
import { APP_CONFIG, getCapacitorPlatform, isCapacitorNative } from "./appConfig";
import { openNativeReview } from "./appReview";

// Sharing and user-initiated links to the store review page.

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

export async function rateApp() {
  const platform = getCapacitorPlatform();
  if (platform === "ios" && APP_CONFIG.iosAppStoreUrl) {
    try {
      if (!(await openNativeReview())) toast.error("تعذّر فتح App Store، حاول مرة أخرى");
    } catch {
      // Older installed builds may not include the native review bridge yet.
      window.location.assign(`${APP_CONFIG.iosAppStoreUrl}?action=write-review`);
    }
  } else if (platform === "android" && APP_CONFIG.androidPlayStoreUrl) {
    window.open(APP_CONFIG.androidPlayStoreUrl, "_blank");
  } else if (isCapacitorNative()) {
    toast.info("سيكون التقييم متاحاً بعد نشر التطبيق في المتجر قريباً");
  } else {
    window.open(`${APP_CONFIG.iosAppStoreUrl}?action=write-review`, "_blank", "noopener,noreferrer");
  }
}
