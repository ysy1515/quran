import { createLocalStore, durableWritesSettled, useLocalStore } from "./localStore";
import { isCapacitorNative } from "./appConfig";
import { ANDROID_REMINDERS_CHANNEL } from "./muezzins";

// Daily reminders (wird, morning/evening athkar, sunnah surahs). They are local
// notifications repeating every day at the chosen time, scheduled on the device.
// Prayer notifications are separate (IDs 1000–1999, see useLocalNotifications).

export type ReminderId = "wird" | "morning" | "evening" | "mulk" | "baqarah";

export interface Reminder {
  on: boolean;
  time: string; // "HH:MM", 24h
}

export type Reminders = Record<ReminderId, Reminder>;

export const REMINDER_IDS: ReminderId[] = ["wird", "morning", "evening", "mulk", "baqarah"];

export const DEFAULT_REMINDERS: Reminders = {
  wird: { on: false, time: "20:00" },
  morning: { on: false, time: "07:00" },
  evening: { on: false, time: "17:30" },
  mulk: { on: false, time: "21:00" },
  baqarah: { on: false, time: "20:30" },
};

export const REMINDER_TEXT: Record<ReminderId, { title: string; body: string; route: string }> = {
  wird: { title: "ورد اليوم", body: "حان وقت قراءة وردك من الختمة", route: "/" },
  morning: { title: "أذكار الصباح", body: "حان وقت أذكار الصباح", route: "/athkar/morning" },
  evening: { title: "أذكار المساء", body: "حان وقت أذكار المساء", route: "/athkar/evening" },
  mulk: { title: "سورة الملك", body: "حان وقت قراءة سورة الملك", route: "/mushaf/67" },
  baqarah: { title: "سورة البقرة", body: "حان وقت قراءة سورة البقرة", route: "/mushaf/2" },
};

// Notification IDs 2000–2099 belong to these reminders.
const ID_BASE = 2000;
const NOTIF_ID: Record<ReminderId, number> = { wird: 2001, morning: 2002, evening: 2003, mulk: 2004, baqarah: 2005 };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseReminders(raw: unknown): Reminders | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const out = { ...DEFAULT_REMINDERS };
  for (const id of REMINDER_IDS) {
    const v = r[id];
    if (typeof v !== "object" || v === null) continue;
    const { on, time } = v as Record<string, unknown>;
    out[id] = {
      on: typeof on === "boolean" ? on : DEFAULT_REMINDERS[id].on,
      time: typeof time === "string" && TIME_RE.test(time) ? time : DEFAULT_REMINDERS[id].time,
    };
  }
  return out;
}

export const remindersStore = createLocalStore<Reminders>("quran.reminders.v1", DEFAULT_REMINDERS, parseReminders);

export function useReminders(): Reminders {
  return useLocalStore(remindersStore);
}

export const remindersSupported = () => isCapacitorNative();

async function plugin() {
  return (await import("@capacitor/local-notifications")).LocalNotifications;
}

/** Ask for permission (native only). */
export async function requestReminderPermission(): Promise<boolean> {
  if (!isCapacitorNative()) return false;
  try {
    const ln = await plugin();
    const res = await ln.requestPermissions();
    return res.display === "granted";
  } catch {
    return false;
  }
}

export type ReminderResult = "ok" | "denied" | "unsupported" | "error";
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work);
  queue = run.catch(() => undefined);
  return run;
}

/** Read saved settings inside the queue so a resume cannot restore stale alerts. */
export function syncReminders(): Promise<ReminderResult> {
  return enqueue(() => scheduleReminders(remindersStore.get()));
}

async function scheduleReminders(r: Reminders): Promise<ReminderResult> {
  if (!isCapacitorNative()) return "unsupported";
  try {
    const ln = await plugin();
    if (REMINDER_IDS.some((id) => r[id].on) && (await ln.checkPermissions()).display !== "granted") return "denied";
    const pending = await ln.getPending();
    const notifications = REMINDER_IDS.filter((id) => r[id].on).map((id) => {
      const [hour, minute] = r[id].time.split(":").map(Number) as [number, number];
      return {
        id: NOTIF_ID[id],
        title: REMINDER_TEXT[id].title,
        body: REMINDER_TEXT[id].body,
        schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
        // iOS plays no sound unless one is named; "default" is the system notification sound.
        // Android 8+ takes the sound from the channel (created in MainActivity.java).
        sound: "default",
        channelId: ANDROID_REMINDERS_CHANNEL,
        smallIcon: "ic_stat_mushafak",
        iconColor: "#1a4731",
        extra: { route: REMINDER_TEXT[id].route, kind: "reminder" },
      };
    });
    if (notifications.length) await ln.schedule({ notifications });
    const wanted = new Set(notifications.map((n) => n.id));
    const obsolete = pending.notifications.filter((n) => n.id >= ID_BASE && n.id < ID_BASE + 100 && !wanted.has(n.id));
    if (obsolete.length) await ln.cancel({ notifications: obsolete.map((n) => ({ id: n.id })) });
    return "ok";
  } catch (err) {
    console.warn("[Reminders] schedule failed:", err);
    return "error";
  }
}

export function setReminder(id: ReminderId, patch: Partial<Reminder>): Promise<ReminderResult> {
  return enqueue(async () => {
    if (!isCapacitorNative()) return "unsupported";
    if (patch.time !== undefined && !TIME_RE.test(patch.time)) return "error";
    if (patch.on && !(await requestReminderPermission())) return "denied";
    const previous = remindersStore.get();
    const next = { ...previous, [id]: { ...previous[id], ...patch } };
    if (!next[id].on) {
      // Turning a reminder off must also work after OS permission is revoked.
      try {
        await (await plugin()).cancel({ notifications: [{ id: NOTIF_ID[id] }] });
      } catch {
        return "error";
      }
    } else {
      const result = await scheduleReminders(next);
      if (result !== "ok") return result;
    }
    remindersStore.set(next);
    await durableWritesSettled();
    return "ok";
  });
}
