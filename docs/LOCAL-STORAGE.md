# On-device data: native Preferences with a localStorage mirror

Phase 1 moved personal data off the shared server onto the device. Since the UI
redesign (PR #3), on iOS and Android the personal data below is kept in native
`@capacitor/preferences` (UserDefaults on iOS), which the OS does not evict.
`localStorage` is still written as a mirror and stays the only store on the web.

## What is stored

| Key | Contents | Loss impact |
| --- | --- | --- |
| `quran.readingStop.v1` | last reading position | low |
| `quran.progress.v1` | reading progress / stats | medium |
| `quran.settings.v1` | reader settings | low |
| `quran.notifTimes.v1` | reminder times | low |
| `quran.pushOwnership.v1` | push manage token | low (see below) |
| `push-prefs` | push preferences (legacy key) | low |
| `adhan_prefs`, `adhan_coords` | prayer method, madhab, location | low, re-detected |
| `dhikr-state` | tasbeeh: chosen dhikr, target, finished rounds, current count | medium |
| `quran.khatmah.v1` | current khatmah plan, completed portions, finished khatmas | high |
| `quran.bookmarks.v1` | multiple bookmarks (الفواصل) | medium |
| `quran.favorites.v1` | favourite ayat, with the ayah text as received from the API | medium |
| `quran.reminders.v1` | daily reminders on/off and time (native notifications 2001–2005) | low |
| `quran.readingTime.v1` | seconds spent with the Mushaf open | low |
| `quran.adhanPlace.v1` | city name for the saved prayer location | low, re-detected |

All `quran.*.v1` values are validated on read (`createLocalStore`), so corrupt or
missing data falls back to defaults instead of crashing.

## Known limitations

- Capacitor's storage guide says localStorage "must be considered transient,
  meaning your app needs to expect that the data will be lost eventually", because
  "the OS will reclaim local storage from Web Views if a device is running low on
  space". It says the same of IndexedDB on iOS.
  (https://capacitorjs.com/docs/guides/storage, checked 2026-10-15)
- WKWebView data is tied to the WebView origin. Changing `server.iosScheme`,
  `server.hostname` or `server.androidScheme` in `capacitor.config.ts` changes the
  origin and every user loses their data. Do not change these before the migration.
- WKWebView keeps this data inside the app container (under `Library/WebKit`). It
  is not synced across devices; whether it survives a device restore was not
  tested.
- Lost push token: the app shows reminders as off, and turning them on creates a
  new subscription. The old one stops receiving (push service returns 410) and the
  server deletes it.

No eviction has been observed in this app; the risk comes from the platform docs.

## Native storage and the migration (implemented)

Code: `src/lib/localStore.ts` (`connectDurableStorage`), `src/lib/persistence.ts`
(`DURABLE_KEYS`, Preferences backend), called from `src/main.tsx` before the first
render. Tests: `src/lib/persistence.test.ts`.

Durable keys (same names as before): `quran.khatmah.v1`, `quran.bookmarks.v1`,
`quran.favorites.v1`, `quran.readingStop.v1`, `quran.progress.v1`, `dhikr-state`,
`quran.readingTime.v1`, `quran.settings.v1`, `quran.reminders.v1`, `adhan_prefs`,
`adhan_coords`, `quran.adhanPlace.v1`. Push-related keys stay in localStorage only
(the push plugin is removed).

At each launch on native, for each key:
1. Preferences has a valid value: it is used. localStorage is not touched.
2. Otherwise, if localStorage has a valid value and Preferences has none, it is
   copied across unchanged. The localStorage copy is never deleted.
3. A corrupt value on either side is ignored and left in place; an existing
   Preferences value is never overwritten by the migration.
4. Running it again is a no-op. `quran.migrated.v1` (in Preferences) records the
   first launch where every key was read without error.
5. A key whose Preferences read fails or takes over 3 s keeps using localStorage
   for that launch.

Every later write goes to localStorage and Preferences, in order.

Next steps: one release after this ships, stop reading localStorage for these keys
(keep writing nothing to it). Supabase sync (approved for Phase 2) reads from this
store.
