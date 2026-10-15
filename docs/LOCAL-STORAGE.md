# On-device data: localStorage risks and the Phase 2 plan

Phase 1 moved personal data off the shared server onto the device. It currently
uses `localStorage` inside the Capacitor WebView.

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
| `dhikr-state` | dhikr counter sessions | medium |

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

## Phase 2 migration (not started; needs approval)

Target: `@capacitor/preferences` (UserDefaults on iOS, SharedPreferences on
Android, not evicted) for all current keys. They are all small. SQLite only if
bookmarks/history grow large or Supabase sync needs a local queue.

1. Add a `DeviceStorage` interface behind `createLocalStore` (it already takes a
   storage argument), with a Preferences implementation on native and
   localStorage on web.
2. At startup, before the first render, for each key: if Preferences has no value
   and localStorage has one, copy it across unchanged. Never delete the
   localStorage copy in the same release.
3. Idempotent: running it again changes nothing; a `quran.migrated.v1` marker
   records completion.
4. Tests: copy, no overwrite of newer Preferences data, corrupt source ignored,
   second run is a no-op.
5. One release later, stop reading localStorage. Keep the same key names.
6. Supabase sync (approved for Phase 2) then reads from this store.
