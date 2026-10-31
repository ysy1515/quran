# Reminder activation follow-up (PR #6)

The adhan settings switch previously returned immediately after acquiring a missing
location. The first click therefore saved the location but never requested
notification permission or enabled reminders. It now continues after successful
location acquisition and stops only when location acquisition fails.

Daily reminder changes previously saved the enabled flag before scheduling, then
swallowed scheduling errors and reported success. Changes now report scheduling
or cancellation failures, keep the previous saved setting on failure, and persist
successful changes through the existing local/native storage backend. The UI
disables the row controls while saving and displays a failure message when needed.

Reminder edits and app-resume synchronization share a queue, with settings read
inside the queue. Existing notification IDs are replaced rather than cancelling
all daily reminders before scheduling; prayer notification IDs remain untouched.
Disabling an individual reminder also works after notification permission is
revoked, without modifying the other reminder preferences. Daily repetition is
explicit; the plugin already repeated calendar schedules implicitly, so missing
`repeats` was not the cause of the activation failure.

Validation on Windows:

- Quran unit suite: 142 passed, including 8 new daily reminder tests covering
  permission denial, schedule/cancellation failures, retry, concurrent edits and
  resume, input validation, cancellation isolation, and native-store restoration.
- Playwright: 37 passed using headless Edge, including first-click activation,
  enable/disable persistence across reload, and location denial.
- TypeScript project references and Quran typecheck passed.
- ESLint on all changed TypeScript/TSX files and `git diff --check` passed.
- Mobile web-assets build passed (existing bundle-size warning).

The repository excludes Windows native tooling packages. Matching test binaries
were installed locally under ignored `node_modules`; no dependency or lockfile
changes are included. Browser tests mock location/permission, and unit tests mock
the native notifications plugin and durable storage. Real-device sound, delivery,
and native iOS/Android builds were not verified in this follow-up. No release,
deployment, store upload, or merge was performed.
