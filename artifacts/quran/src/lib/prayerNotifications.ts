import { getCapacitorPlatform, isCapacitorNative } from "./appConfig";
import type { AdhanPrefs, Coords } from "./prayer";
import {
  fingerprint,
  planPrayerNotifications,
  PRAYER_ID_MAX,
  PRAYER_ID_MIN,
  type PlannedNotification,
  type Platform,
} from "./prayerSchedule";

// Keeps the device's pending prayer notifications equal to the plan from
// prayerSchedule.ts. Runs on app start, on resume, every 30 minutes while open,
// and whenever location or prayer settings change. Calls are queued so two syncs
// never interleave, and IDs are stable per prayer, so a repeated sync replaces
// notifications instead of adding duplicates.
//
// Local notifications only. Web Push (usePushNotifications.ts) is a separate,
// browser-only system and is never used inside the native app.

export type DisplayPermission = "granted" | "denied" | "prompt" | "unsupported";

export interface SyncResult {
  status: "scheduled" | "unchanged" | "cleared" | "no-permission" | "unsupported" | "error";
  planned: number;
  cancelled: number;
}

const SMALL_ICON = "ic_stat_mushafak";
const ICON_COLOR = "#1a4731";

function plugin() {
  // Capacitor plugins are Proxies with a synthetic `then` method. Resolve the
  // module instead, otherwise Promise assimilation hangs before any native call.
  return import("@capacitor/local-notifications");
}

function platform(): Platform {
  return getCapacitorPlatform() === "android" ? "android" : "ios";
}

const devLog = (...args: unknown[]) => {
  // Development builds only; never logs coordinates.
  if (import.meta.env.DEV) console.info("[PrayerNotifications]", ...args);
};

export async function checkDisplayPermission(): Promise<DisplayPermission> {
  if (!isCapacitorNative()) return "unsupported";
  try {
    const r = await (await plugin()).LocalNotifications.checkPermissions();
    return r.display === "granted" ? "granted" : r.display === "denied" ? "denied" : "prompt";
  } catch {
    return "unsupported";
  }
}

/** Android 12+: whether alarms may fire at the exact minute. iOS and older Android: always "granted". */
export async function checkExactAlarm(): Promise<"granted" | "denied" | "unsupported"> {
  if (!isCapacitorNative() || platform() !== "android") return "unsupported";
  try {
    const r = await (await plugin()).LocalNotifications.checkExactNotificationSetting();
    return r.exact_alarm === "granted" ? "granted" : "denied";
  } catch {
    return "unsupported";
  }
}

/** Opens Android's "Alarms & reminders" page for this app. */
export async function openExactAlarmSettings(): Promise<void> {
  if (!isCapacitorNative() || platform() !== "android") return;
  try {
    await (await plugin()).LocalNotifications.changeExactNotificationSetting();
  } catch {
    // The settings page is not available on this device.
  }
}

function toSchema(n: PlannedNotification) {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    schedule: { at: n.at, allowWhileIdle: true },
    sound: n.sound,
    channelId: n.channelId,
    smallIcon: SMALL_ICON,
    iconColor: ICON_COLOR,
    autoCancel: true,
    extra: {
      route: "/adhan",
      kind: n.kind,
      prayer: n.prayer ?? "",
      at: String(n.at.getTime()),
      prayerTime: n.prayerTime ? String(n.prayerTime.getTime()) : "",
    },
  };
}

/** Fingerprints of what this process last scheduled, by ID. */
const scheduled = new Map<string, string>();
let queue: Promise<unknown> = Promise.resolve();

export function syncPrayerNotifications(coords: Coords | null, prefs: AdhanPrefs, now?: Date): Promise<SyncResult> {
  const run = queue.then(() => doSync(coords, prefs, now));
  queue = run.catch(() => undefined);
  return run;
}

async function doSync(coords: Coords | null, prefs: AdhanPrefs, now?: Date): Promise<SyncResult> {
  if (!isCapacitorNative()) return { status: "unsupported", planned: 0, cancelled: 0 };
  try {
    const { LocalNotifications: ln } = await plugin();
    const pending = (await ln.getPending()).notifications.filter(
      (n) => n.id >= PRAYER_ID_MIN && n.id <= PRAYER_ID_MAX,
    );
    const permission = await checkDisplayPermission();
    // Read the clock after native awaits: a suspended app must not replay old prayers.
    const plan = planPrayerNotifications(coords, prefs, now ?? new Date(), platform());
    const wanted = new Map(plan.map((n) => [String(n.id), n]));
    const obsolete = pending.filter((n) => !wanted.has(String(n.id)));
    if (obsolete.length) await ln.cancel({ notifications: obsolete.map((n) => ({ id: n.id })) });
    obsolete.forEach((n) => scheduled.delete(String(n.id)));

    if (!plan.length) return { status: "cleared", planned: 0, cancelled: obsolete.length };
    if (permission !== "granted") {
      return { status: "no-permission", planned: plan.length, cancelled: obsolete.length };
    }

    const pendingIds = new Set(pending.map((n) => String(n.id)));
    const cutoff = now?.getTime() ?? Date.now();
    const toSchedule = plan.filter((n) => n.at.getTime() > cutoff && (!pendingIds.has(String(n.id)) || scheduled.get(String(n.id)) !== fingerprint(n)));
    if (!toSchedule.length) return { status: "unchanged", planned: plan.length, cancelled: obsolete.length };

    // Same ID replaces the pending notification on both platforms.
    await ln.schedule({ notifications: toSchedule.map(toSchema) });
    toSchedule.forEach((n) => scheduled.set(String(n.id), fingerprint(n)));
    devLog(`scheduled ${toSchedule.length}, cancelled ${obsolete.length}, planned ${plan.length}`);
    return { status: "scheduled", planned: plan.length, cancelled: obsolete.length };
  } catch (err) {
    devLog("sync failed", err);
    return { status: "error", planned: 0, cancelled: 0 };
  }
}

export function cancelAllPrayerNotifications(): Promise<void> {
  const run = queue.then(async () => {
    if (!isCapacitorNative()) return;
    try {
      const { LocalNotifications: ln } = await plugin();
      const ours = (await ln.getPending()).notifications.filter((n) => n.id >= PRAYER_ID_MIN && n.id <= PRAYER_ID_MAX);
      if (ours.length) await ln.cancel({ notifications: ours.map((n) => ({ id: n.id })) });
      scheduled.clear();
    } catch {
      // nothing pending
    }
  });
  queue = run.catch(() => undefined);
  return run;
}

export interface PendingSummary {
  id: number;
  at: Date | null;
  title: string;
  kind: string;
  prayerTime: Date | null;
}

export interface PendingReminder {
  id: number;
  title: string;
  time: string; // "HH:MM" of the daily repeat
}

export interface PendingOverview {
  total: number;
  prayer: PendingSummary[];
  reminders: PendingReminder[];
}

/** What is pending on the device, for the diagnostics section. */
export async function pendingNotifications(): Promise<PendingOverview> {
  if (!isCapacitorNative()) return { total: 0, prayer: [], reminders: [] };
  try {
    const all = (await (await plugin()).LocalNotifications.getPending()).notifications;
    const num = (v: unknown) => (typeof v === "string" && v ? new Date(Number(v)) : null);
    const prayer = all
      .filter((n) => n.id >= PRAYER_ID_MIN && n.id <= PRAYER_ID_MAX)
      .map((n) => {
        const extra = (n.extra ?? {}) as Record<string, unknown>;
        const at = num(extra.at) ?? (n.schedule?.at ? new Date(n.schedule.at) : null);
        return { id: n.id, at, title: n.title, kind: String(extra.kind ?? ""), prayerTime: num(extra.prayerTime) };
      })
      .sort((a, b) => (a.at?.getTime() ?? 0) - (b.at?.getTime() ?? 0));
    const two = (v: unknown) => String(typeof v === "number" ? v : 0).padStart(2, "0");
    const reminders = all
      .filter((n) => n.id >= 2000 && n.id < 2100)
      .map((n) => ({ id: n.id, title: n.title, time: `${two(n.schedule?.on?.hour)}:${two(n.schedule?.on?.minute)}` }))
      .sort((a, b) => a.id - b.id);
    return { total: all.length, prayer, reminders };
  } catch {
    return { total: 0, prayer: [], reminders: [] };
  }
}
