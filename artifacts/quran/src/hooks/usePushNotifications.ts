import { useState, useEffect, useCallback } from "react";

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

export function usePushNotifications() {
  const [status, setStatus] = useState<NotificationStatus>("default");
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [prefs, setPrefs] = useState<PushPreferences>({ notifyQuran: true, notifyDhikr: true });
  const [loading, setLoading] = useState(false);

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

  return { status, subscription, prefs, loading, isNative, isSupported, register, unsubscribe, updatePreferences };
}
