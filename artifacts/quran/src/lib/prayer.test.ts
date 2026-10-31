import { describe, expect, it } from "vitest";
import { calcParams, DEFAULT_ADHAN_PREFS, localNoon, nextPrayer, parseAdhanPrefs, prayerTimesFor, umAlQuraMonth } from "./prayer";

// Khamis Mushait, Aseer (city centre, WGS84). Saudi Arabia is UTC+3 all year (no DST),
// so times are checked as UTC instants: they do not depend on the test machine's zone.
const KHAMIS = { lat: 18.3, lng: 42.7333 };
const utc = (d: Date) => d.toISOString().slice(11, 16);
const times = (date: Date, madhab = "Shafi", calcMethod = "UmmAlQura") =>
  Object.fromEntries(prayerTimesFor(KHAMIS, date, { calcMethod, madhab }).map((p) => [p.key, p.time]));

describe("Khamis Mushait prayer times (Umm al-Qura)", () => {
  it("31 Oct 2026 matches the published Umm al-Qura table to the minute", () => {
    // Published (khaleejcalculators.com, Umm al-Qura, local UTC+3):
    // Fajr 04:52, Sunrise 06:08, Dhuhr 11:53, Asr 15:10, Maghrib 17:37, Isha 19:07.
    const t = times(new Date(2026, 9, 31, 9));
    expect(utc(t.fajr)).toBe("01:52");
    expect(utc(t.sunrise)).toBe("03:08");
    expect(utc(t.dhuhr)).toBe("08:53");
    expect(utc(t.asr)).toBe("12:10");
    expect(utc(t.maghrib)).toBe("14:37");
    expect(utc(t.isha)).toBe("16:07");
  });

  it("is rounded to whole minutes", () => {
    for (const d of Object.values(times(new Date(2026, 9, 31)))) expect(d.getUTCSeconds()).toBe(0);
  });

  it("Hanafi Asr is later than the standard (Shafi) Asr; other prayers are unchanged", () => {
    const shafi = times(new Date(2026, 9, 31), "Shafi");
    const hanafi = times(new Date(2026, 9, 31), "Hanafi");
    expect(utc(hanafi.asr)).toBe("13:01");
    expect(hanafi.asr.getTime() - shafi.asr.getTime()).toBe(51 * 60_000);
    for (const k of ["fajr", "dhuhr", "maghrib", "isha"]) expect(hanafi[k]!.getTime()).toBe(shafi[k]!.getTime());
  });

  it("Isha is 90 minutes after Maghrib, and 120 minutes in Ramadan", () => {
    const normal = times(new Date(2026, 9, 31));
    expect(normal.isha.getTime() - normal.maghrib.getTime()).toBe(90 * 60_000);
    const ramadanDay = new Date(2027, 1, 15); // 9 Ramadan 1448
    expect(umAlQuraMonth(ramadanDay)).toBe(9);
    const ramadan = times(ramadanDay);
    expect(ramadan.isha.getTime() - ramadan.maghrib.getTime()).toBe(120 * 60_000);
  });

  it("the Ramadan rule applies to Umm al-Qura only", () => {
    expect(calcParams("MuslimWorldLeague", "Shafi", new Date(2027, 1, 15)).ishaInterval).toBe(0);
    expect(calcParams("UmmAlQura", "Shafi", new Date(2026, 9, 31)).ishaInterval).toBe(90);
  });
});

describe("calculation defaults", () => {
  it("defaults to Umm al-Qura with the standard Asr", () => {
    expect(DEFAULT_ADHAN_PREFS.calcMethod).toBe("UmmAlQura");
    expect(DEFAULT_ADHAN_PREFS.madhab).toBe("Shafi");
    expect(calcParams("nonsense", "Shafi").method).toBe("UmmAlQura");
  });

  it("the time of day passed in does not change the day's times", () => {
    const early = times(new Date(2026, 9, 31, 0, 5));
    const late = times(new Date(2026, 9, 31, 23, 55));
    expect(early.fajr.getTime()).toBe(late.fajr.getTime());
  });

  it("after Isha the next prayer is tomorrow's Fajr (midnight transition)", () => {
    const t = times(new Date(2026, 9, 31));
    const n = nextPrayer(KHAMIS, new Date(t.isha.getTime() + 60_000), DEFAULT_ADHAN_PREFS);
    expect(n.key).toBe("fajr");
    expect(n.time.getTime()).toBe(times(new Date(2026, 10, 1)).fajr.getTime());
  });

  it("localNoon keeps the calendar day", () => {
    const d = localNoon(new Date(2026, 11, 31, 23, 59), 1);
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2027, 0, 1, 12]);
  });
});

describe("saved prayer settings", () => {
  it("keeps every valid saved choice, including the muezzin", () => {
    const saved = { ...DEFAULT_ADHAN_PREFS, enabled: true, muezzinId: "adhan-4", madhab: "Hanafi", calcMethod: "Egyptian", reminderMinutes: 10, alertSound: "device" };
    expect(parseAdhanPrefs(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });

  it("adds the new sound setting to prefs saved by older builds without touching the rest", () => {
    const old = { enabled: true, muezzinId: "adhan-3", enabledPrayers: ["fajr", "isha"], snoozedUntil: null, calcMethod: "UmmAlQura", madhab: "Shafi", reminderMinutes: 5, prefsVersion: 2 };
    const out = parseAdhanPrefs(old)!;
    expect(out).toMatchObject(old);
    expect(out.alertSound).toBe("adhan");
  });

  it("does not rewrite an unknown muezzin id (it plays the default recording instead)", () => {
    expect(parseAdhanPrefs({ muezzinId: "haram-ali-mulla", prefsVersion: 2 })!.muezzinId).toBe("haram-ali-mulla");
  });

  it("repairs malformed fields only", () => {
    const out = parseAdhanPrefs({ enabled: "yes", enabledPrayers: ["fajr", "sunrise", 3], reminderMinutes: 7, calcMethod: "X", prefsVersion: 2 })!;
    expect(out.enabled).toBe(false);
    expect(out.enabledPrayers).toEqual(["fajr"]);
    expect(out.reminderMinutes).toBe(0);
    expect(out.calcMethod).toBe("UmmAlQura");
  });
});
