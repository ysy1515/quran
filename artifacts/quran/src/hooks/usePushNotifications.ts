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
  if (!res.ok) throw new Error(`Push not available: ${res.status}`);
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

// The server returns a secret management token once, when this browser's
// subscription is registered. It is the only way to change or delete that
// subscription later, so it is kept with the endpoint it belongs to.
interface PushOwnership {
  endpoint: string;
  token: string;
}

function parseOwnership(raw: unknown): PushOwnership | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { endpoint, token } = raw as Record<string, unknown>;
  if (typeof endpoint !== "string" || typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return { endpoint, token };
}

const ownershipStore = createLocalStore<PushOwnership | null>("quran.pushOwnership.v1", null, parseOwnership);

/** Token for this subscription, or null if this browser doesn't own it on the server. */
function tokenFor(sub: PushSubscription | null): string | null {
  const own = ownershipStore.get();
  return sub && own && own.endpoint === sub.endpoint ? own.token : null;
}

function authHeaders(token: string): HeadersInit {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

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
      try { setPrefs(JSON.parse(saved) as PushPreferences); } catch { /* corrupt saved prefs: keep defaults */ }
    }

    // Check current state
    const perm = Notification.permission;
    if (perm === "denied") { setStatus("denied"); return; }

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        // A browser subscription without our token (created before this update,
        // or under the old keys) isn't manageable; show it as off so the user
        // can enable notifications again, which replaces it.
        if (sub && tokenFor(sub)) {
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

      const vapidKey = await getVapidKey();

      // Always start from a fresh browser subscription: an old one may belong to
      // rotated keys or have no server token, and the server never re-registers
      // an existing endpoint.
      await (await reg.pushManager.getSubscription())?.unsubscribe();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const res = await fetch(`${API_BASE}/api/push/subscribe`, {
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
      if (!res.ok) {
        await sub.unsubscribe();
        throw new Error(`Subscribe failed: ${res.status}`);
      }
      const { manageToken } = (await res.json()) as { manageToken: string };
      ownershipStore.set({ endpoint: sub.endpoint, token: manageToken });

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
      const token = tokenFor(subscription);
      if (token) {
        await fetch(`${API_BASE}/api/push/unsubscribe`, { method: "DELETE", headers: authHeaders(token) });
      }
      await subscription.unsubscribe();
      ownershipStore.set(null);
      setSubscription(null);
      setStatus("default");
    } catch (err) {
      console.error("Unsubscribe failed:", err);
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  const updatePreferences = useCallback(async (newPrefs: PushPreferences) => {
    const token = tokenFor(subscription);
    if (!token) return;
    setPrefs(newPrefs);
    localStorage.setItem("push-prefs", JSON.stringify(newPrefs));
    await fetch(`${API_BASE}/api/push/preferences`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(newPrefs),
    });
  }, [subscription]);

  const saveTimes = useCallback(async (newTimes: NotifTimes) => {
    const parsed = parseNotifTimes(newTimes) ?? DEFAULT_NOTIF_TIMES;
    notifTimesStore.set(parsed);
    const token = tokenFor(subscription);
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/push/times`, {
      method: "PUT",
      headers: authHeaders(token),
      body: JSON.stringify(parsed),
    });
    if (!res.ok) throw new Error(`Saving times failed: ${res.status}`);
  }, [subscription]);

  return { status, subscription, prefs, times, loading, isNative, isSupported, register, unsubscribe, updatePreferences, saveTimes };
}
