import * as adhan from "adhan";
import { createLocalStore, useLocalStore } from "./localStore";
import { ADHAN_PREFS_VERSION, DEFAULT_MADHAB, migrateAdhanPrefs } from "./adhanPrefs";

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
  prefsVersion?: number;
}

export const DEFAULT_ADHAN_PREFS: AdhanPrefs = {
  enabled: false,
  muezzinId: "adhan-1",
  enabledPrayers: ["fajr", "dhuhr", "asr", "maghrib", "isha"],
  snoozedUntil: null,
  calcMethod: "UmmAlQura",
  madhab: DEFAULT_MADHAB,
  reminderMinutes: 0,
  prefsVersion: ADHAN_PREFS_VERSION,
};

export function parseAdhanPrefs(raw: unknown): AdhanPrefs | null {
  if (typeof raw !== "object" || raw === null) return null;
  const merged = migrateAdhanPrefs<AdhanPrefs>(raw as Partial<AdhanPrefs>, DEFAULT_ADHAN_PREFS);
  if (!Array.isArray(merged.enabledPrayers)) merged.enabledPrayers = [...DEFAULT_ADHAN_PREFS.enabledPrayers];
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

function calcParams(method: string, madhab: string): adhan.CalculationParameters {
  const m = adhan.CalculationMethod as Record<string, (() => adhan.CalculationParameters) | undefined>;
  const params = m[method]?.() ?? adhan.CalculationMethod.UmmAlQura();
  params.madhab = madhab === "Hanafi" ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
  return params;
}

export function prayerTimesFor(coords: Coords, date: Date, prefs: Pick<AdhanPrefs, "calcMethod" | "madhab">): PrayerTime[] {
  const pt = new adhan.PrayerTimes(new adhan.Coordinates(coords.lat, coords.lng), date, calcParams(prefs.calcMethod, prefs.madhab));
  return PRAYER_KEYS.map((key) => ({ key, label: PRAYER_LABEL[key], time: pt[key] }));
}

/** The next of the five prayers after `now` (today's, else tomorrow's Fajr). Sunrise is skipped. */
export function nextPrayer(coords: Coords, now: Date, prefs: Pick<AdhanPrefs, "calcMethod" | "madhab">): PrayerTime {
  const today = prayerTimesFor(coords, now, prefs).filter((p) => p.key !== "sunrise" && p.time > now);
  if (today.length) return today[0]!;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return prayerTimesFor(coords, tomorrow, prefs)[0]!;
}

export async function lookupPlaceName(c: Coords): Promise<string> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${c.lat}&lon=${c.lng}&format=json&accept-language=ar`,
    );
    const d = await r.json();
    const name = d.address?.city || d.address?.town || d.address?.village || d.address?.county || d.address?.state || "";
    if (name) placeStore.set(String(name).slice(0, 120));
    return name;
  } catch {
    return "";
  }
}

export function requestLocation(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        coordsStore.set(c);
        void lookupPlaceName(c);
        resolve(c);
      },
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10000 },
    );
  });
}
