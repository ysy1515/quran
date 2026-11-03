# Prayer timing and Qibla — 4 November 2026

## Timing audit

The user confirmed audible delivery of the test notification, but reported a possible late Asr alert. The exact prayer and delivery time are not available. No claim of reproducing the physical-device delay is made.

- Default calculation remains Umm al-Qura with standard (Shafi) Asr. A new “ضبط أم القرى للمملكة” action sets both together and persists them. Explicit choices of other methods remain available.
- Aladhan method 4 / school 0 for Khamis Mushait (18.3, 42.7333), 4 Nov 2026: 04:53 / 06:10 / 11:53 / 15:10 / 17:35 / 19:05. App times agree except Asr 15:09 (one minute earlier). This is an independent calculation, not verification against the official Saudi timetable.
- Reference: https://api.aladhan.com/v1/timings/04-11-2026?latitude=18.3&longitude=42.7333&method=4&school=0&timezonestring=Asia%2FRiyadh
- Scheduled adhan instants equal displayed prayer instants. Regression covers all 17 supported cities in all 12 months, including Ramadan. Existing tests cover the 90/120-minute Isha rule.
- Native sync now reads the clock after awaiting pending notifications and permission. A suspension across a prayer no longer creates a stale past-due schedule; regression advances the clock 30 minutes while awaiting the native bridge.
- The last-day schedule-refresh notice runs 30 minutes after the first planned alert on that day, uses the device sound, and now has the distinct title “تذكير بتحديث جدول التنبيهات”. This is not evidence that it caused the user's delay.
- Removed the test-alert UI and sender. Existing pending ID 1991 is cancelled on synchronization without touching daily reminders.
- iOS settings explain Immediate Delivery, Scheduled Summary and Focus. Delivery remains controlled by the OS.

## Location and Qibla

- Location requests require a fresh high-accuracy fix (maximumAge 0, 20-second timeout). Invalid or >1 km accuracy fixes are rejected without replacing the saved location. No coordinates are logged. Reverse lookup cannot overwrite a newer location's city label.
- More → القبلة calculates a great-circle bearing using the existing adhan library. A saved-location bearing is explicitly labeled.
- iOS uses a registered Core Location bridge in AppDelegate.swift, compiled by the existing target. It uses trueHeading, never magneticHeading as a substitute, with location updates enabled as Apple requires: https://developer.apple.com/documentation/corelocation/clheading/trueheading
- Only fresh readings with nonnegative heading accuracy <=20 degrees and location accuracy <=1 km are accepted. The UI reports approximate accuracy, requires portrait layout and hides the arrow on poor readings or too near the Kaaba relative to position uncertainty. iPad upside-down portrait is corrected. Alignment requires <=5 degrees of turn and sensor accuracy <=10 degrees. The UI tells the user to hold the phone flat, screen up, away from magnets/metals.
- Sensor updates stop when leaving the page or hiding it. Browser and Android currently show the geographic bearing only, explicitly, without pretending to have a live compass.

## Verification limits

Unit and mocked native-bridge UI tests cover timing, persisted settings, precise-location requests, bearing cardinal directions, shortest-turn wrapping, and hiding invalid sensor data. Mobile web build/typecheck/lint are checked separately. Swift cannot be compiled on this Windows workspace: Codemagic must compile it, then TestFlight must be checked with a real iPhone compass and a scheduled prayer while the screen is locked. Neither mathematical tests nor the audible test alert prove future OS delivery or physical sensor accuracy.


Validation results: 180 unit tests passed. The UI suite passed 44 tests initially; the three affected fixtures (missing mocked location accuracy and incorrect ARIA selectors) were corrected and all three passed on rerun, covering 47 scenarios in total. Typecheck, changed-file ESLint and mobile Vite build passed. Existing Sonner source-map and bundle-size warnings remain. The Qibla screen was visually inspected at the iPhone viewport with mocked native readings.
