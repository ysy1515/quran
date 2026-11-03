import { ANDROID_PRAYER_DEFAULT_CHANNEL, muezzinFor } from "./muezzins";
import { localNoon, prayerTimesFor, PRAYER_LABEL, type AdhanPrefs, type Coords, type PrayerKey } from "./prayer";

// Pure planning of the prayer notifications: which ones should be pending right
// now, with which ID, time, sound and channel. The native side (prayerNotifications.ts)
// compares this plan with what is pending and fixes the difference.
//
// IDs 1000–1999 belong to prayer notifications (daily reminders use 2000–2099).
// An ID is derived from the calendar day and the prayer, so the same prayer always
// gets the same ID: scheduling it again replaces it instead of adding a duplicate.

export const PRAYER_ID_MIN = 1000;
export const PRAYER_ID_MAX = 1999;
/** "Open the app to refresh" notice, shown on the last scheduled day. */
export const REFRESH_NOTICE_ID = 1990;

/** Days ahead to keep scheduled. Each app start, resume or settings change moves the window forward. */
export const SCHEDULE_DAYS = 7;
/** iOS keeps at most 64 pending notifications per app; anything beyond is silently dropped. */
export const IOS_PENDING_LIMIT = 64;
/** Room kept on iOS for the 5 daily reminders, the refresh notice and spare capacity. */
const IOS_RESERVED = 8;

export const NOTIFIABLE: Exclude<PrayerKey, "sunrise">[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export type Platform = "ios" | "android";

export interface PlannedNotification {
  id: number;
  kind: "adhan" | "pre" | "refresh";
  prayer?: string;
  /** The calculated prayer time this notification is about. */
  prayerTime?: Date;
  /** When the notification fires. */
  at: Date;
  title: string;
  body: string;
  /** iOS: bundled sound file name, or "default" for the system sound. Android 7: res/raw name. */
  sound: string;
  /** Android 8+: the channel decides the sound. */
  channelId: string;
}

/** Days since 1970-01-01 for the local calendar day of `d` (independent of DST and time of day). */
export function localDayNumber(d: Date): number {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

export function prayerNotificationId(day: Date, prayer: string, kind: "adhan" | "pre"): number {
  const idx = NOTIFIABLE.indexOf(prayer as (typeof NOTIFIABLE)[number]);
  if (idx < 0) throw new Error(`not a notifiable prayer: ${prayer}`);
  // 90 distinct day slots × 10 → 1000–1899; a slot is reused only 90 days later.
  return PRAYER_ID_MIN + (localDayNumber(day) % 90) * 10 + idx + (kind === "pre" ? 5 : 0);
}

/** How many days fit in the platform's pending-notification budget. */
export function scheduleDays(prefs: Pick<AdhanPrefs, "enabledPrayers" | "reminderMinutes">, platform: Platform): number {
  const perDay = prefs.enabledPrayers.filter((p) => NOTIFIABLE.includes(p as never)).length * (prefs.reminderMinutes > 0 ? 2 : 1);
  if (platform === "android" || perDay === 0) return SCHEDULE_DAYS;
  return Math.max(2, Math.min(SCHEDULE_DAYS, Math.floor((IOS_PENDING_LIMIT - IOS_RESERVED) / perDay)));
}

export function soundFor(prefs: Pick<AdhanPrefs, "alertSound" | "muezzinId">, platform: Platform): { sound: string; channelId: string } {
  if (prefs.alertSound === "device") return { sound: "default", channelId: ANDROID_PRAYER_DEFAULT_CHANNEL };
  const m = muezzinFor(prefs.muezzinId);
  return { sound: platform === "ios" ? m.iosSound : m.androidRaw, channelId: m.androidChannel };
}

export function planPrayerNotifications(
  coords: Coords | null,
  prefs: AdhanPrefs,
  now: Date,
  platform: Platform,
): PlannedNotification[] {
  if (!coords || !prefs.enabled || prefs.snoozedUntil === -1) return [];
  const notBefore = Math.max(now.getTime(), prefs.snoozedUntil ?? 0);
  const days = scheduleDays(prefs, platform);
  const adhanSound = soundFor(prefs, platform);
  const deviceSound = soundFor({ alertSound: "device", muezzinId: prefs.muezzinId }, platform);
  const out: PlannedNotification[] = [];

  for (let d = 0; d < days; d++) {
    const day = localNoon(now, d);
    for (const t of prayerTimesFor(coords, day, prefs)) {
      if (t.key === "sunrise" || !prefs.enabledPrayers.includes(t.key)) continue;
      const label = PRAYER_LABEL[t.key];
      if (t.time.getTime() > notBefore) {
        out.push({
          id: prayerNotificationId(day, t.key, "adhan"),
          kind: "adhan",
          prayer: t.key,
          prayerTime: t.time,
          at: t.time,
          title: `حان وقت صلاة ${label}`,
          body: "حيَّ على الصلاة · حيَّ على الفلاح",
          ...adhanSound,
        });
      }
      if (prefs.reminderMinutes > 0) {
        const at = new Date(t.time.getTime() - prefs.reminderMinutes * 60_000);
        if (at.getTime() > notBefore) {
          out.push({
            id: prayerNotificationId(day, t.key, "pre"),
            kind: "pre",
            prayer: t.key,
            prayerTime: t.time,
            at,
            title: `${label} بعد ${prefs.reminderMinutes} دقيقة`,
            body: `تبقّى ${prefs.reminderMinutes} دقيقة على أذان ${label} · استعدّ للصلاة`,
            ...deviceSound,
          });
        }
      }
    }
  }

  out.sort((a, b) => a.at.getTime() - b.at.getTime());

  // Without the app being opened nothing can extend the schedule (neither iOS nor
  // Android lets an app wake itself reliably to do it), so on the last scheduled
  // day the user is told to open the app before the alerts run out.
  if (out.length) {
    const lastDay = localNoon(out[out.length - 1]!.at);
    const firstOfLastDay = out.find((n) => localDayNumber(n.at) === localDayNumber(lastDay))!;
    const at = new Date(firstOfLastDay.at.getTime() + 30 * 60_000);
    if (localDayNumber(lastDay) > localDayNumber(now) && at.getTime() > now.getTime()) {
      out.push({
        id: REFRESH_NOTICE_ID,
        kind: "refresh",
        at,
        title: "تذكير بتحديث جدول التنبيهات",
        body: "افتح مصحفك لتحديث تنبيهات الأذان للأيام القادمة",
        ...deviceSound,
      });
    }
  }
  return out;
}

/** Fingerprint of a planned notification, to tell whether a pending one is still correct. */
export function fingerprint(n: PlannedNotification): string {
  return `${n.id}|${n.at.getTime()}|${n.title}|${n.sound}|${n.channelId}`;
}
