import { useState, useEffect, useCallback } from "react";
import { createLocalStore, useLocalStore } from "@/lib/localStore";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function isCapacitorNative(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor?.isNativePlatform?.()
  );
}

async function getVapidKey(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/push/vapid-public-key`);
  const data = await res.json() as { publicKey: string };
  return data.publicKey;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export type NotificationStatus = "unsupported" | "native" | "denied" | "default" | "granted" | "subscribed";

export interface PushPreferences {
  notifyQuran: boolean;
  notifyDhikr: boolean;
}

/** Reminder times, "HH:MM" Saudi time. Kept on this device and sent with this browser's subscription. */
export interface NotifTimes {
  notifQuran1: string;
  notifQuran2: string;
  notifDhikr: string;
}

export const DEFAULT_NOTIF_TIMES: NotifTimes = { notifQuran1: "12:00", notifQuran2: "18:00", notifDhikr: "21:00" };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseNotifTimes(raw: unknown): NotifTimes | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const pick = (k: keyof NotifTimes) =>
    typeof r[k] === "string" && TIME_RE.test(r[k] as string) ? (r[k] as string) : DEFAULT_NOTIF_TIMES[k];
  return { notifQuran1: pick("notifQuran1"), notifQuran2: pick("notifQuran2"), notifDhikr: pick("notifDhikr") };
}

const notifTimesStore = createLocalStore<NotifTimes>("quran.notifTimes.v1", DEFAULT_NOTIF_TIMES, parseNotifTimes);

export function usePushNotifications() {
  const [status, setStatus] = useState<NotificationStatus>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [prefs, setPrefs] = useState<PushPreferences>({ notifyQuran: true, notifyDhikr: true });
  const [loading, setLoading] = useState(false);
  const times = useLocalStore(notifTimesStore);

  // On native Capacitor, Web Push API is not applicable — local notifications handle prayer reminders
  const isNative = isCapacitorNative();

  const isSupported =
    isNative ||
    (
      typeof window !== "undefined" &&
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window
    );

  useEffect(() => {
    if (isNative) {
      setStatus("native");
      return;
    }

    if (!isSupported) {
      setStatus("unsupported");
      return;
    }

    // Load saved prefs from localStorage
    const saved = localStorage.getItem("push-prefs");
    if (saved) {
      try { setPrefs(JSON.parse(saved) as PushPreferences); } catch {}
    }

    // Check current state
    const perm = Notification.permission;
    if (perm === "denied") { setStatus("denied"); return; }

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setSubscription(sub);
          setStatus("subscribed");
        } else {
          setStatus(perm === "granted" ? "granted" : "default");
        }
      });
    });
  }, [isNative, isSupported]);

  const register = useCallback(async (preferences: PushPreferences = prefs) => {
    if (isNative || !isSupported) return;
    setLoading(true);
    try {
      // Register service worker
      const swPath = import.meta.env.BASE_URL + "sw.js";
      const reg = await navigator.serviceWorker.register(swPath, { scope: import.meta.env.BASE_URL });
      await navigator.serviceWorker.ready;

      // Request permission
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus("denied");
        return;
      }

      // Get VAPID key and subscribe
      const vapidKey = await getVapidKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      // Send to backend
      const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await fetch(`${API_BASE}/api/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          notifyQuran: preferences.notifyQuran,
          notifyDhikr: preferences.notifyDhikr,
          ...notifTimesStore.get(),
        }),
      });

      setSubscription(sub);
      setStatus("subscribed");
      setPrefs(preferences);
      localStorage.setItem("push-prefs", JSON.stringify(preferences));
    } catch (err) {
      console.error("Push registration failed:", err);
    } finally {
      setLoading(false);
    }
  }, [isNative, isSupported, prefs]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/push/unsubscribe`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
      setSubscription(null);
      setStatus("default");
    } catch (err) {
      console.error("Unsubscribe failed:", err);
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  const updatePreferences = useCallback(async (newPrefs: PushPreferences) => {
    if (!subscription) return;
    setPrefs(newPrefs);
    localStorage.setItem("push-prefs", JSON.stringify(newPrefs));
    const subJson = subscription.toJSON() as { endpoint: string };
    await fetch(`${API_BASE}/api/push/preferences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subJson.endpoint, ...newPrefs }),
    });
  }, [subscription]);

  const saveTimes = useCallback(async (newTimes: NotifTimes) => {
    const parsed = parseNotifTimes(newTimes) ?? DEFAULT_NOTIF_TIMES;
    notifTimesStore.set(parsed);
    if (!subscription) return;
    const res = await fetch(`${API_BASE}/api/push/times`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint, ...parsed }),
    });
    if (!res.ok) throw new Error(`Saving times failed: ${res.status}`);
  }, [subscription]);

  return { status, subscription, prefs, times, loading, isNative, isSupported, register, unsubscribe, updatePreferences, saveTimes };
}
