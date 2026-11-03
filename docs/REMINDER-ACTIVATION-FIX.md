# Reminder activation follow-up (PR #6)

## Follow-up: native notification bridge deadlock

The reported dim switches and non-working test notification were reproduced with
the real Capacitor JavaScript proxy. Both notification modules returned the
`LocalNotifications` proxy from an async helper. Promise resolution reads `then`
on that proxy; Capacitor turns it into a native method call and reports
`"LocalNotifications.then()" is not implemented on ios`. The helper never
settles, leaving startup synchronization and subsequent reminder edits stuck.
This also blocks prayer synchronization, pending diagnostics and test alerts.

Both helpers now resolve the imported module, with the plugin extracted only
after awaiting it. Native reminder calls have bounded waits and distinguish a
missing plugin, denied permission, timeout and scheduling failure. The reminder
row shows its saving/error state persistently instead of only a brief toast.
The earlier unit tests used plain plugin objects and missed the Proxy behavior;
the added browser tests retain the real Capacitor proxy and mock only the OS
bridge. They reproduced the failure before the helper fix and pass after it.

Validation for this follow-up: 146 unit tests and 41 Playwright tests passed;
Quran TypeScript, ESLint on changed source/tests, diff whitespace checks and the
mobile web-assets build passed. The three new bridge/UI tests cover all five
reminder switches, saved-state restoration, cancellation, permission denial,
the prayer test alert and pending diagnostics. These are simulated OS calls,
not a native iOS build or a physical-device delivery test.

The full unit run also exposed a date-dependent snooze test failure: the planner
used wall-clock time to interpret snooze while accepting an explicit planning
time. It now consistently compares snooze against the supplied planning time.

This validates the JavaScript/native-call boundary, not physical iOS delivery.
After building this commit in Codemagic, test on the installed TestFlight app:
enable a daily reminder, check its pending time, restart and confirm it is still
enabled, then use the test-notification button and lock the screen. Actual sound
and arrival on a physical phone remain unverified here.

## Earlier activation and persistence changes

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
