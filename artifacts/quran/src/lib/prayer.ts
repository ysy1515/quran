import * as adhan from "adhan";
import { createLocalStore, useLocalStore } from "./localStore";
import { ADHAN_PREFS_VERSION, DEFAULT_MADHAB, migrateAdhanPrefs } from "./adhanPrefs";
import { DEFAULT_MUEZZIN_ID } from "./muezzins";

// Shared prayer-time state for the Prayer screen and its settings screen. The
// storage keys and formats are the ones the Adhan page always used.

export interface AdhanPrefs {
  enabled: boolean;
  muezzinId: string;
  enabledPrayers: string[];
  snoozedUntil: number | null;
  calcMethod: string;
  madhab: string;
  reminderMinutes: number;
  /**
   * Sound of the prayer notification: "adhan" plays the selected muezzin (a 29 s
   * clip on iOS, the full recording on Android), "device" the phone's default
   * notification sound.
   */
  alertSound: AlertSound;
  prefsVersion?: number;
}

export type AlertSound = "adhan" | "device";

export const CALC_METHOD_IDS = [
  "UmmAlQura",
  "MuslimWorldLeague",
  "Egyptian",
  "Karachi",
  "NorthAmerica",
  "Dubai",
  "Kuwait",
  "Qatar",
  "Singapore",
  "Turkey",
] as const;

export const REMINDER_MINUTE_OPTIONS = [0, 5, 10, 15] as const;
const NOTIFIABLE_PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

export const DEFAULT_ADHAN_PREFS: AdhanPrefs = {
  enabled: false,
  muezzinId: DEFAULT_MUEZZIN_ID,
  enabledPrayers: ["fajr", "dhuhr", "asr", "maghrib", "isha"],
  snoozedUntil: null,
  calcMethod: "UmmAlQura",
  madhab: DEFAULT_MADHAB,
  reminderMinutes: 0,
  alertSound: "adhan",
  prefsVersion: ADHAN_PREFS_VERSION,
};

export function parseAdhanPrefs(raw: unknown): AdhanPrefs | null {
  if (typeof raw !== "object" || raw === null) return null;
  const merged = migrateAdhanPrefs<AdhanPrefs>(raw as Partial<AdhanPrefs>, DEFAULT_ADHAN_PREFS);
  if (!Array.isArray(merged.enabledPrayers)) merged.enabledPrayers = [...DEFAULT_ADHAN_PREFS.enabledPrayers];
  else merged.enabledPrayers = merged.enabledPrayers.filter((k) => NOTIFIABLE_PRAYERS.includes(k));
  // Malformed fields fall back to their defaults; valid saved choices are kept as they are.
  if (typeof merged.enabled !== "boolean") merged.enabled = DEFAULT_ADHAN_PREFS.enabled;
  if (typeof merged.muezzinId !== "string") merged.muezzinId = DEFAULT_ADHAN_PREFS.muezzinId;
  if (!(CALC_METHOD_IDS as readonly string[]).includes(merged.calcMethod)) merged.calcMethod = DEFAULT_ADHAN_PREFS.calcMethod;
  if (merged.madhab !== "Hanafi") merged.madhab = "Shafi";
  if (!(REMINDER_MINUTE_OPTIONS as readonly number[]).includes(merged.reminderMinutes)) merged.reminderMinutes = 0;
  if (merged.alertSound !== "device") merged.alertSound = "adhan";
  if (merged.snoozedUntil !== null && typeof merged.snoozedUntil !== "number") merged.snoozedUntil = null;
  return merged;
}

export interface Coords {
  lat: number;
  lng: number;
}

export function parseCoords(raw: unknown): Coords | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { lat, lng } = raw as Record<string, unknown>;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return null;
  return { lat, lng };
}

export const adhanPrefsStore = createLocalStore<AdhanPrefs>("adhan_prefs", DEFAULT_ADHAN_PREFS, parseAdhanPrefs);
export const coordsStore = createLocalStore<Coords | null>("adhan_coords", null, parseCoords);
/** Last place name found for the saved coordinates, so the header shows it offline. */
export const placeStore = createLocalStore<string>("quran.adhanPlace.v1", "", (v) =>
  typeof v === "string" && v.length <= 120 ? v : null,
);

export const useAdhanPrefs = () => useLocalStore(adhanPrefsStore);
export const useCoords = () => useLocalStore(coordsStore);
export const usePlace = () => useLocalStore(placeStore);

export function updateAdhanPrefs(patch: Partial<AdhanPrefs>) {
  adhanPrefsStore.update((p) => ({ ...p, ...patch }));
}

export function isSnoozed(until: number | null): boolean {
  if (!until) return false;
  if (until === -1) return true;
  return Date.now() < until;
}

export const PRAYER_KEYS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];

export const PRAYER_LABEL: Record<PrayerKey, string> = {
  fajr: "الفجر",
  sunrise: "الشروق",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

export interface PrayerTime {
  key: PrayerKey;
  label: string;
  time: Date;
}

/** Umm al-Qura month (1–12) of the local calendar day of `date`, or null if the runtime lacks the calendar. */
export function umAlQuraMonth(date: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", { month: "numeric" }).formatToParts(date);
    const m = Number(parts.find((p) => p.type === "month")?.value);
    return Number.isInteger(m) && m >= 1 && m <= 12 ? m : null;
  } catch {
    return null;
  }
}

export function calcParams(method: string, madhab: string, date?: Date): adhan.CalculationParameters {
  const m = adhan.CalculationMethod as Record<string, (() => adhan.CalculationParameters) | undefined>;
  const known = (CALC_METHOD_IDS as readonly string[]).includes(method);
  const params = (known ? m[method]?.() : undefined) ?? adhan.CalculationMethod.UmmAlQura();
  params.madhab = madhab === "Hanafi" ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
  // Umm al-Qura sets Isha 90 minutes after Maghrib, and 120 minutes during Ramadan.
  // The adhan library leaves the Ramadan rule to the app (its docs recommend +30).
  if (params.method === "UmmAlQura" && date && umAlQuraMonth(date) === 9) params.ishaInterval = 120;
  return params;
}

/** Noon of the same local calendar day, so date arithmetic never lands on the wrong day across DST changes. */
export function localNoon(date: Date, addDays = 0): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + addDays, 12, 0, 0, 0);
}

/**
 * Prayer times for the local calendar day of `date`. The adhan library takes the
 * day's year/month/day and the coordinates, and returns absolute instants (Date),
 * so no time-zone offset is assumed anywhere: the device clock shows them in its
 * own zone.
 */
export function prayerTimesFor(coords: Coords, date: Date, prefs: Pick<AdhanPrefs, "calcMethod" | "madhab">): PrayerTime[] {
  const day = localNoon(date);
  const pt = new adhan.PrayerTimes(new adhan.Coordinates(coords.lat, coords.lng), day, calcParams(prefs.calcMethod, prefs.madhab, day));
  return PRAYER_KEYS.map((key) => ({ key, label: PRAYER_LABEL[key], time: pt[key] }));
}

/** The next of the five prayers after `now` (today's, else tomorrow's Fajr). Sunrise is skipped. */
export function nextPrayer(coords: Coords, now: Date, prefs: Pick<AdhanPrefs, "calcMethod" | "madhab">): PrayerTime {
  const today = prayerTimesFor(coords, now, prefs).filter((p) => p.key !== "sunrise" && p.time > now);
  if (today.length) return today[0]!;
  return prayerTimesFor(coords, localNoon(now, 1), prefs)[0]!;
}

export async function lookupPlaceName(c: Coords): Promise<string> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${c.lat}&lon=${c.lng}&format=json&accept-language=ar`,
    );
    const d = await r.json();
    const name = d.address?.city || d.address?.town || d.address?.village || d.address?.county || d.address?.state || "";
    if (name && coordsStore.get()?.lat === c.lat && coordsStore.get()?.lng === c.lng) placeStore.set(String(name).slice(0, 120));
    return name;
  } catch {
    return "";
  }
}

/** Sets the location by hand (city list), without GPS or network. */
export function setManualLocation(c: Coords, name: string) {
  coordsStore.set({ lat: c.lat, lng: c.lng });
  placeStore.set(name.slice(0, 120));
}

export function requestLocation(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = parseCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (!c || !Number.isFinite(pos.coords.accuracy) || pos.coords.accuracy < 0 || pos.coords.accuracy > 1000) {
          reject(new Error("inaccurate-location"));
          return;
        }
        coordsStore.set(c);
        // The old name belongs to the old coordinates; clear it so an offline lookup never leaves a wrong city.
        placeStore.set("");
        void lookupPlaceName(c);
        resolve(c);
      },
      (err) => reject(err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  });
}
