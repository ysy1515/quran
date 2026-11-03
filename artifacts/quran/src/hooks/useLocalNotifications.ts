import { useCallback, useEffect, useState } from "react";
import { isCapacitorNative } from "@/lib/appConfig";
import type { AdhanPrefs, Coords } from "@/lib/prayer";
import { cancelAllPrayerNotifications, checkDisplayPermission, syncPrayerNotifications } from "@/lib/prayerNotifications";

export type LocalNotifPermission = "unknown" | "granted" | "denied" | "unsupported";

export function useLocalNotifications() {
  const [permission, setPermission] = useState<LocalNotifPermission>("unknown");
  const isSupported = isCapacitorNative();

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isCapacitorNative()) {
      // Web fallback: use browser Notification API
      if (!("Notification" in window)) {
        setPermission("unsupported");
        return false;
      }
      const result = await Notification.requestPermission();
      const granted = result === "granted";
      setPermission(granted ? "granted" : "denied");
      return granted;
    }

    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const result = await LocalNotifications.requestPermissions();
      const granted = result.display === "granted";
      setPermission(granted ? "granted" : "denied");
      return granted;
    } catch {
      setPermission("unsupported");
      return false;
    }
  }, []);

  const checkPermission = useCallback(async () => {
    if (!isCapacitorNative()) {
      if (!("Notification" in window)) { setPermission("unsupported"); return; }
      const p = Notification.permission;
      setPermission(p === "granted" ? "granted" : p === "denied" ? "denied" : "unknown");
      return;
    }
    const p = await checkDisplayPermission();
    setPermission(p === "granted" ? "granted" : p === "denied" ? "denied" : p === "prompt" ? "unknown" : "unsupported");
  }, []);

  useEffect(() => {
    void checkPermission();
  }, [checkPermission]);

  const schedulePrayers = useCallback(
    (coords: Coords | null, prefs: AdhanPrefs) => syncPrayerNotifications(coords, prefs),
    [],
  );

  return {
    permission,
    isSupported,
    requestPermission,
    checkPermission,
    schedulePrayers,
    cancelAllPrayer: cancelAllPrayerNotifications,
  };
}
