import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTheme } from "next-themes";
import { useAdhanPrefs, useCoords, adhanPrefsStore } from "@/lib/prayer";
import { syncReminders } from "@/lib/reminders";
import { getCapacitorPlatform, isCapacitorNative } from "@/lib/appConfig";
import { notificationRoute } from "@/lib/notificationRoute";
import { syncPrayerNotifications } from "@/lib/prayerNotifications";
import { shouldPlayFullAdhanOnTap } from "@/lib/notificationTap";
import { muezzinFor } from "@/lib/muezzins";
import { playAdhan } from "@/lib/adhanPlayer";
import { maybeRequestReview, recordReviewVisit } from "@/lib/appReview";

const RESYNC_INTERVAL_MS = 30 * 60_000;

/**
 * App-wide side effects that must run whichever screen is open:
 * prayer notifications stay scheduled, daily reminders are re-synced, the iOS
 * status bar matches the green header, and tapping a reminder opens its screen.
 */
export default function AppEffects() {
  const [route, navigate] = useLocation();
  const prefs = useAdhanPrefs();
  const coords = useCoords();
  const { resolvedTheme } = useTheme();

  // Ask only on the home screen, after established use, never over the reader.
  useEffect(() => {
    if (getCapacitorPlatform() !== "ios") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const consider = () => {
      clearTimeout(timer);
      if (document.visibilityState !== "visible") return;
      recordReviewVisit();
      if (route === "/") timer = setTimeout(() => {
        if (document.visibilityState === "visible") void maybeRequestReview();
      }, 4000);
    };
    consider();
    document.addEventListener("visibilitychange", consider);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", consider); };
  }, [route]);

  // Settings or location changed: bring the pending prayer notifications in line.
  useEffect(() => {
    void syncPrayerNotifications(coords, prefs);
  }, [coords, prefs]);

  // Resume, and a periodic refresh while open, move the 7-day window forward and
  // pick up a new day, a changed clock or time zone, or a permission granted in Settings.
  useEffect(() => {
    const resync = () => {
      if (document.visibilityState !== "visible") return;
      void syncPrayerNotifications(coords, prefs);
      void syncReminders();
    };
    document.addEventListener("visibilitychange", resync);
    const t = setInterval(resync, RESYNC_INTERVAL_MS);
    return () => {
      document.removeEventListener("visibilitychange", resync);
      clearInterval(t);
    };
  }, [coords, prefs]);

  useEffect(() => {
    void syncReminders();
  }, []);

  useEffect(() => {
    if (!isCapacitorNative()) return;
    import("@capacitor/status-bar")
      .then(({ StatusBar, Style }) => StatusBar.setStyle({ style: Style.Dark }))
      .catch(() => {});
  }, [resolvedTheme]);

  useEffect(() => {
    if (!isCapacitorNative()) return;
    let remove: (() => void) | undefined;
    import("@capacitor/local-notifications")
      .then(({ LocalNotifications }) =>
        LocalNotifications.addListener("localNotificationActionPerformed", (e) => {
          const extra = e.notification.extra;
          const p = adhanPrefsStore.get();
          if (shouldPlayFullAdhanOnTap(extra, getCapacitorPlatform(), p.alertSound, Date.now())) {
            const m = muezzinFor(p.muezzinId);
            void playAdhan(m.id, m.audioUrl);
          }
          const route = notificationRoute(extra);
          if (route) navigate(route);
        }),
      )
      .then((handle) => {
        remove = () => void handle.remove();
      })
      .catch(() => {});
    return () => remove?.();
  }, [navigate]);

  return null;
}
