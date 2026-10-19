import { Preferences } from "@capacitor/preferences";
import { isCapacitorNative } from "./appConfig";
import { connectDurableStorage, type DurableBackend, type MigrationReport } from "./localStore";
// Importing the stores registers their keys and validators.
import { bookmarksStore, favoritesStore } from "./bookmarks";
import { dhikrStore } from "./dhikr";
import { khatmahStore } from "./khatmah";
import { adhanPrefsStore, coordsStore, placeStore } from "./prayer";
import { readingTimeStore } from "./readingTime";
import { remindersStore } from "./reminders";
import { progressStore, readingStopStore, settingsStore } from "./userData";

void [bookmarksStore, favoritesStore, dhikrStore, khatmahStore, adhanPrefsStore, coordsStore, placeStore];
void [readingTimeStore, remindersStore, progressStore, readingStopStore, settingsStore];

/** Personal data kept in native storage on iOS/Android. Key names are unchanged from localStorage. */
export const DURABLE_KEYS = [
  "quran.khatmah.v1",
  "quran.bookmarks.v1",
  "quran.favorites.v1",
  "quran.readingStop.v1",
  "quran.progress.v1",
  "dhikr-state",
  "quran.readingTime.v1",
  "quran.settings.v1",
  "quran.reminders.v1",
  "adhan_prefs",
  "adhan_coords",
  "quran.adhanPlace.v1",
] as const;

const CALL_TIMEOUT_MS = 3000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Preferences timed out")), CALL_TIMEOUT_MS);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e)),
    );
  });
}

export const preferencesBackend: DurableBackend = {
  async get(key) {
    const { value } = await withTimeout(Preferences.get({ key }));
    return value ?? null;
  },
  async set(key, value) {
    await withTimeout(Preferences.set({ key, value }));
  },
};

/**
 * Runs before the first render on iOS/Android: loads saved data from native
 * Preferences and copies anything only found in localStorage across. On the web
 * localStorage stays the only store.
 */
export async function initPersistence(): Promise<MigrationReport | null> {
  if (!isCapacitorNative()) return null;
  try {
    return await connectDurableStorage(preferencesBackend, DURABLE_KEYS);
  } catch {
    return null; // keep using localStorage for this launch
  }
}
