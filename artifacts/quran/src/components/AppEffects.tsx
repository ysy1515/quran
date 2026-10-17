import { useEffect } from "react";
import { useLocation } from "wouter";
import { useTheme } from "next-themes";
import { useLocalNotifications } from "@/hooks/useLocalNotifications";
import { useAdhanPrefs, useCoords } from "@/lib/prayer";
import { syncReminders } from "@/lib/reminders";
import { isCapacitorNative } from "@/lib/appConfig";

/**
 * App-wide side effects that must run whichever screen is open:
 * prayer notifications stay scheduled, daily reminders are re-synced, the iOS
 * status bar matches the green header, and tapping a reminder opens its screen.
 */
export default function AppEffects() {
  const [, navigate] = useLocation();
  const prefs = useAdhanPrefs();
  const coords = useCoords();
  const { schedulePrayers } = useLocalNotifications();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    void schedulePrayers(coords, prefs);
  }, [coords, prefs, schedulePrayers]);

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
          const route = (e.notification.extra as { route?: unknown } | undefined)?.route;
          if (typeof route === "string" && route.startsWith("/")) navigate(route);
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
