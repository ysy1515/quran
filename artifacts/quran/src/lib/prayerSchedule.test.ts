import { describe, expect, it } from "vitest";
import { DEFAULT_ADHAN_PREFS, prayerTimesFor, type AdhanPrefs } from "./prayer";
import {
  fingerprint,
  IOS_PENDING_LIMIT,
  localDayNumber,
  planPrayerNotifications,
  prayerNotificationId,
  PRAYER_ID_MAX,
  PRAYER_ID_MIN,
  REFRESH_NOTICE_ID,
  scheduleDays,
  SCHEDULE_DAYS,
  soundFor,
  TEST_NOTIFICATION_ID,
} from "./prayerSchedule";
import { ANDROID_PRAYER_DEFAULT_CHANNEL, MUEZZINS } from "./muezzins";

const KHAMIS = { lat: 18.3, lng: 42.7333 };
const ON: AdhanPrefs = { ...DEFAULT_ADHAN_PREFS, enabled: true };
// One hour after Fajr on 31 Oct 2026, so it is after Fajr and before Dhuhr in any time zone.
const NOW = new Date(prayerTimesFor(KHAMIS, new Date(2026, 9, 31, 12), DEFAULT_ADHAN_PREFS)[0]!.time.getTime() + 3600_000);

describe("notification IDs", () => {
  it("are unique for every prayer and kind over 90 days and stay in the prayer range", () => {
    const seen = new Set<number>();
    for (let d = 0; d < 90; d++) {
      const day = new Date(2026, 9, 31 + d, 12);
      for (const p of ["fajr", "dhuhr", "asr", "maghrib", "isha"])
        for (const k of ["adhan", "pre"] as const) {
          const id = prayerNotificationId(day, p, k);
          expect(seen.has(id)).toBe(false);
          seen.add(id);
          expect(id).toBeGreaterThanOrEqual(PRAYER_ID_MIN);
          expect(id).toBeLessThan(REFRESH_NOTICE_ID);
        }
    }
    expect(TEST_NOTIFICATION_ID).toBeLessThanOrEqual(PRAYER_ID_MAX);
  });

  it("do not depend on the time of day", () => {
    expect(prayerNotificationId(new Date(2026, 9, 31, 0, 1), "asr", "adhan")).toBe(prayerNotificationId(new Date(2026, 9, 31, 23, 59), "asr", "adhan"));
    expect(localDayNumber(new Date(2026, 9, 31, 0, 1))).toBe(localDayNumber(new Date(2026, 9, 31, 23, 59)));
  });
});

describe("planPrayerNotifications", () => {
  it("plans nothing when off, without a location, or snoozed until manual resume", () => {
    expect(planPrayerNotifications(KHAMIS, DEFAULT_ADHAN_PREFS, NOW, "ios")).toEqual([]);
    expect(planPrayerNotifications(null, ON, NOW, "ios")).toEqual([]);
    expect(planPrayerNotifications(KHAMIS, { ...ON, snoozedUntil: -1 }, NOW, "ios")).toEqual([]);
  });

  it("covers the next 7 days, at the calculated prayer times, never in the past, without duplicates", () => {
    const plan = planPrayerNotifications(KHAMIS, ON, NOW, "android");
    const adhan = plan.filter((n) => n.kind === "adhan");
    expect(adhan.length).toBe(SCHEDULE_DAYS * 5 - 1); // today's Fajr has passed
    expect(new Set(plan.map((n) => n.id)).size).toBe(plan.length);
    for (const n of plan) expect(n.at.getTime()).toBeGreaterThan(NOW.getTime());
    const today = prayerTimesFor(KHAMIS, NOW, ON);
    expect(adhan[0]!.prayer).toBe("dhuhr");
    expect(adhan[0]!.at.getTime()).toBe(today.find((t) => t.key === "dhuhr")!.time.getTime());
  });

  it("is idempotent: the same input gives the same IDs and contents", () => {
    const a = planPrayerNotifications(KHAMIS, ON, NOW, "ios").map(fingerprint);
    const b = planPrayerNotifications(KHAMIS, ON, new Date(NOW.getTime() + 60_000), "ios").map(fingerprint);
    expect(b).toEqual(a);
  });

  it("changing the madhab moves Asr under the same IDs (the old one is replaced, not duplicated)", () => {
    const shafi = planPrayerNotifications(KHAMIS, ON, NOW, "ios").filter((n) => n.prayer === "asr");
    const hanafi = planPrayerNotifications(KHAMIS, { ...ON, madhab: "Hanafi" }, NOW, "ios").filter((n) => n.prayer === "asr");
    expect(hanafi.map((n) => n.id)).toEqual(shafi.map((n) => n.id));
    expect(hanafi[0]!.at.getTime()).toBeGreaterThan(shafi[0]!.at.getTime());
  });

  it("only enabled prayers are planned", () => {
    const plan = planPrayerNotifications(KHAMIS, { ...ON, enabledPrayers: ["fajr"] }, NOW, "ios");
    expect(new Set(plan.filter((n) => n.kind !== "refresh").map((n) => n.prayer))).toEqual(new Set(["fajr"]));
  });

  it("a reminder offset adds an early alert with the device sound and keeps the adhan alert on time", () => {
    const plan = planPrayerNotifications(KHAMIS, { ...ON, reminderMinutes: 10 }, NOW, "android");
    const dhuhr = plan.filter((n) => n.prayer === "dhuhr").slice(0, 2);
    const pre = dhuhr.find((n) => n.kind === "pre")!;
    const adhan = dhuhr.find((n) => n.kind === "adhan")!;
    expect(adhan.at.getTime() - pre.at.getTime()).toBe(10 * 60_000);
    expect(pre.channelId).toBe(ANDROID_PRAYER_DEFAULT_CHANNEL);
    expect(adhan.channelId).toBe(MUEZZINS[0]!.androidChannel);
  });

  it("stays within the iOS limit of 64 pending notifications, leaving room for the daily reminders", () => {
    for (const reminderMinutes of [0, 15]) {
      const plan = planPrayerNotifications(KHAMIS, { ...ON, reminderMinutes }, NOW, "ios");
      expect(plan.length + 5 + 1).toBeLessThanOrEqual(IOS_PENDING_LIMIT);
    }
    expect(scheduleDays({ ...ON, reminderMinutes: 15 }, "ios")).toBe(5);
    expect(scheduleDays(ON, "ios")).toBe(SCHEDULE_DAYS);
  });

  it("a timed snooze skips alerts until it ends", () => {
    const until = new Date(2026, 10, 3, 0, 0).getTime();
    const plan = planPrayerNotifications(KHAMIS, { ...ON, snoozedUntil: until }, NOW, "ios");
    expect(plan.length).toBeGreaterThan(0);
    for (const n of plan) expect(n.at.getTime()).toBeGreaterThan(until);
  });

  it("tells the user on the last scheduled day to open the app", () => {
    const plan = planPrayerNotifications(KHAMIS, ON, NOW, "ios");
    const notice = plan.find((n) => n.id === REFRESH_NOTICE_ID)!;
    expect(notice).toBeDefined();
    const lastAdhan = plan.filter((n) => n.kind === "adhan").at(-1)!;
    expect(localDayNumber(notice.at)).toBe(localDayNumber(lastAdhan.at));
    expect(notice.at.getTime()).toBeLessThan(lastAdhan.at.getTime());
  });

  it("just before midnight, the first alert is tomorrow's Fajr", () => {
    const plan = planPrayerNotifications(KHAMIS, ON, new Date(2026, 9, 31, 23, 59), "ios");
    expect(plan[0]!.prayer).toBe("fajr");
    expect(localDayNumber(plan[0]!.at)).toBe(localDayNumber(new Date(2026, 10, 1)));
  });
});

describe("sound configuration", () => {
  it("uses the selected muezzin: a bundled 29 s clip on iOS, its own channel on Android", () => {
    const prefs = { alertSound: "adhan" as const, muezzinId: "adhan-3" };
    expect(soundFor(prefs, "ios")).toEqual({ sound: "adhan_3.caf", channelId: "prayer_adhan_3_v1" });
    expect(soundFor(prefs, "android")).toEqual({ sound: "adhan_3", channelId: "prayer_adhan_3_v1" });
  });

  it("uses the system sound when chosen, and the default recording for an unknown muezzin", () => {
    expect(soundFor({ alertSound: "device", muezzinId: "adhan-3" }, "ios").sound).toBe("default");
    expect(soundFor({ alertSound: "device", muezzinId: "adhan-3" }, "android").channelId).toBe(ANDROID_PRAYER_DEFAULT_CHANNEL);
    expect(soundFor({ alertSound: "adhan", muezzinId: "gone" }, "ios").sound).toBe("adhan_1.caf");
  });

  it("every planned notification names a sound (iOS is silent without one)", () => {
    for (const n of planPrayerNotifications(KHAMIS, { ...ON, reminderMinutes: 5 }, NOW, "ios")) expect(n.sound).toBeTruthy();
  });
});
