import { useCallback, useEffect, useRef, useState } from "react";
import * as adhan from "adhan";

export type LocalNotifPermission = "unknown" | "granted" | "denied" | "unsupported";

interface AdhanPrefsForScheduling {
  enabled: boolean;
  enabledPrayers: string[];
  reminderMinutes: number;
  calcMethod: string;
  madhab: string;
  muezzinId: string;
  snoozedUntil: number | null;
}

interface Coords {
  lat: number;
  lng: number;
}

// Detect Capacitor native environment
function isCapacitorNative(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.()
  );
}

function isSnoozed(until: number | null): boolean {
  if (!until) return false;
  if (until === -1) return true;
  return Date.now() < until;
}

function getCalcParams(method: string, madhab: string): adhan.CalculationParameters {
  const m = adhan.CalculationMethod as Record<string, (() => adhan.CalculationParameters) | undefined>;
  const params = m[method]?.() ?? adhan.CalculationMethod.UmmAlQura();
  params.madhab = madhab === "Hanafi" ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
  return params;
}

const PRAYER_LABELS: Record<string, string> = {
  fajr: "الفجر",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

// ID range: 1000–1999 for prayer notifications
const PRAYER_NOTIF_ID_BASE = 1000;

export function useLocalNotifications() {
  const [permission, setPermission] = useState<LocalNotifPermission>("unknown");
  const scheduleKey = useRef<string>("");

  // Check if local notifications are supported
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
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const result = await LocalNotifications.checkPermissions();
      setPermission(result.display === "granted" ? "granted" : result.display === "denied" ? "denied" : "unknown");
    } catch {
      setPermission("unsupported");
    }
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const cancelAllPrayer = useCallback(async () => {
    if (!isCapacitorNative()) return;
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const pending = await LocalNotifications.getPending();
      const prayerNotifs = pending.notifications.filter(
        (n) => n.id >= PRAYER_NOTIF_ID_BASE && n.id < PRAYER_NOTIF_ID_BASE + 1000
      );
      if (prayerNotifs.length > 0) {
        await LocalNotifications.cancel({ notifications: prayerNotifs.map((n) => ({ id: n.id })) });
      }
    } catch {}
  }, []);

  const schedulePrayers = useCallback(
    async (coords: Coords | null, prefs: AdhanPrefsForScheduling) => {
      if (!isCapacitorNative()) return;
      if (!coords || !prefs.enabled || isSnoozed(prefs.snoozedUntil)) {
        await cancelAllPrayer();
        return;
      }

      // Build a key to avoid redundant rescheduling
      const key = JSON.stringify({ coords, prefs });
      if (key === scheduleKey.current) return;
      scheduleKey.current = key;

      try {
        const { LocalNotifications } = await import("@capacitor/local-notifications");

        // Cancel old prayer notifications first
        await cancelAllPrayer();

        const coordinates = new adhan.Coordinates(coords.lat, coords.lng);
        const params = getCalcParams(prefs.calcMethod, prefs.madhab);
        const now = new Date();
        let idCounter = PRAYER_NOTIF_ID_BASE;
        const notifications: {
          id: number;
          title: string;
          body: string;
          schedule: { at: Date };
          channelId: string;
          smallIcon?: string;
          extra: Record<string, string>;
        }[] = [];

        // Schedule for today and tomorrow
        for (let dayOffset = 0; dayOffset <= 1; dayOffset++) {
          const date = new Date();
          date.setDate(date.getDate() + dayOffset);

          const pt = new adhan.PrayerTimes(coordinates, date, params);
          const prayers: Array<{ key: string; time: Date }> = [
            { key: "fajr",    time: pt.fajr },
            { key: "dhuhr",   time: pt.dhuhr },
            { key: "asr",     time: pt.asr },
            { key: "maghrib", time: pt.maghrib },
            { key: "isha",    time: pt.isha },
          ];

          for (const prayer of prayers) {
            if (!prefs.enabledPrayers.includes(prayer.key)) continue;

            const notifTime = new Date(
              prayer.time.getTime() - prefs.reminderMinutes * 60_000
            );
            if (notifTime <= now) continue;

            const label = PRAYER_LABELS[prayer.key] ?? prayer.key;
            const isReminder = prefs.reminderMinutes > 0;

            notifications.push({
              id: idCounter++,
              title: isReminder
                ? `🕌 ${label} بعد ${prefs.reminderMinutes} دقيقة`
                : `🕌 حان وقت ${label}`,
              body: isReminder
                ? `تبقّى ${prefs.reminderMinutes} دقيقة على أذان ${label} · استعدّ للصلاة`
                : "حيَّ على الصلاة · حيَّ على الفلاح",
              schedule: { at: notifTime },
              channelId: "prayer-reminders",
              smallIcon: "ic_notification",
              extra: { prayer: prayer.key, day: String(dayOffset) },
            });
          }
        }

        if (notifications.length > 0) {
          await LocalNotifications.schedule({ notifications });
        }
      } catch (err) {
        console.warn("[LocalNotifications] schedule failed:", err);
      }
    },
    [cancelAllPrayer]
  );

  return {
    permission,
    isSupported,
    requestPermission,
    schedulePrayers,
    cancelAllPrayer,
  };
}
