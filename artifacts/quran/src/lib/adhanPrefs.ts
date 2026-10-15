// Asr calculation default. The standard (Shafi'i, Maliki, Hanbali) method is the
// common practice in Saudi Arabia; Hanafi remains selectable on the Adhan page.
export const DEFAULT_MADHAB = "Shafi";

// Version 2 changed the default madhab from Hanafi to Shafi. Prefs saved before
// that always stored "Hanafi" (it was preselected), so they are moved to the new
// default once. Anything the user picks after this is kept.
export const ADHAN_PREFS_VERSION = 2;

export function migrateAdhanPrefs<T extends { madhab: string }>(
  stored: Partial<T> & { prefsVersion?: number },
  defaults: T,
): T & { prefsVersion: number } {
  const merged = { ...defaults, ...stored } as T;
  if ((stored.prefsVersion ?? 1) < 2) merged.madhab = DEFAULT_MADHAB;
  return { ...merged, prefsVersion: ADHAN_PREFS_VERSION };
}
