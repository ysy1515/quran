# Prayer notifications, adhan audio and reminders — مصحفك

This is how notifications work in the native app (iOS and Android), what was wrong
before October 2026, and what can only be checked on a real phone.

## Two separate systems

| System | Where | Used for | Code |
|---|---|---|---|
| **Local notifications** (`@capacitor/local-notifications`) | iOS and Android app | Prayer alerts (IDs 1000–1999) and the daily reminders: wird, morning/evening athkar, Al-Mulk, Al-Baqarah (IDs 2000–2099) | `src/lib/prayerSchedule.ts`, `src/lib/prayerNotifications.ts`, `src/lib/reminders.ts` |
| **Web Push** (VAPID, service worker) | Website in a browser only | Quran and evening-athkar reminders for browser users, sent by the API server at Saudi times | `src/hooks/usePushNotifications.ts`, `artifacts/api-server` |

The native app never uses Web Push (`usePushNotifications` reports `native` and the
browser-notification section of Settings is hidden). No Firebase, APNs push or backend is
involved in prayer alerts: they are calculated and scheduled on the phone.

## Audit findings (root causes)

| # | Problem | Root cause (verified in code) | Platform | Fix |
|---|---|---|---|---|
| 1 | Prayer banners appear without sound | Notifications were scheduled without a `sound`. The plugin sets `content.sound` only when one is given, and documents "no sound on iOS" otherwise (`LocalNotificationsPlugin.swift`, `definitions.d.ts`). The `sound: "default"` in `capacitor.config.ts` is Android-only. Daily reminders had the same bug. | iOS | Every notification names a sound: a bundled adhan clip, or `"default"` for the system sound. |
| 2 | Prayer alerts never shown on Android | They used `channelId: "prayer-reminders"`, a channel that was never created. Android 8+ drops notifications posted to a missing channel. | Android | Channels are created natively at launch (`NotificationChannels.java`). |
| 3 | Selected muezzin never heard at prayer time | `muezzinId` was used only by the preview button. No code path played it at prayer time, and the in-app "announcement" was only a toast. | Both | The muezzin now sets the notification sound (iOS clip / Android full recording) and the full adhan plays in-app after tapping (iOS). |
| 4 | Alerts late | Android: alarms were `setExact(RTC)` without `allowWhileIdle`, which Doze defers to the next maintenance window, and without `SCHEDULE_EXACT_ALARM` the plugin falls back to an inexact `set()`. After a reboot the plugin re-fired every missed alert 15 s after boot (so a Fajr alert could arrive at noon). | Android | `allowWhileIdle: true` (→ `setExactAndAllowWhileIdle(RTC_WAKEUP)`), `SCHEDULE_EXACT_ALARM` with an in-app prompt, and a patch that drops alerts more than 10 minutes stale after boot. |
| 5 | Alerts stop after two days | Only today and tomorrow were scheduled, and only when settings changed (a cached key blocked rescheduling while the app stayed open, across day changes and resumes). | Both | 7-day rolling window, refreshed on start, resume, every 30 min while open and on any change; an "open the app" notice on the last day. |
| 6 | Settings could appear to revert | The native entry point (`main.mobile.tsx`) never called `initPersistence()`, so every setting, bookmark, khatmah and tasbeeh count lived only in WebView `localStorage`, which iOS may clear. | Both | `initPersistence()` now runs before the first render on native: data is copied once into Capacitor Preferences (never deleted or overwritten). |
| 7 | GPS city label could be wrong | A new GPS fix kept the previous place name until the online lookup finished; offline it stayed wrong. | Both | The old name is cleared with new coordinates; a manual city list is added. |
| 8 | Duplicates possible | A browser `Notification` was also shown from the prayer screen at prayer time, and sequential IDs depended on the order of scheduling. | Both | No browser notification inside the native app; IDs are derived from the date and prayer. |

## How a prayer alert sounds now

| Setting "صوت التنبيه" | iOS | Android 8+ |
|---|---|---|
| الأذان (default) | First 29 s of the selected adhan (`ios/App/App/Sounds/adhan_N.caf`). iOS plays at most 30 s for a notification sound. Tapping the notification opens the app and plays the **full** adhan there. | The **full** adhan recording is the channel sound (`res/raw/adhan_N.mp3`, channel `prayer_adhan_N_v1`). It stops when the notification is swiped away or tapped. Tapping does not replay it. |
| صوت الجهاز | System default notification sound | Channel `prayer_default_v1` (device default sound) |

- "تنبيه قبل الأذان" (5/10/15 min) adds an **extra** early alert with the device sound; the adhan alert stays at the prayer time. Before, the offset replaced the on-time alert.
- Sounds follow the phone's silent switch / ringer mode, Focus / Do Not Disturb and notification volume. No critical alerts, time-sensitive entitlement, background audio mode, foreground service, full-screen intent or battery-optimisation exemption is used.
- A full adhan **cannot** start by itself from a closed app on iOS: only the notification sound (≤ 30 s) plays. This is an iOS limit, not a bug.
- Android channel sounds cannot be changed after creation. If a recording changes, give it a new channel ID (`_v2`) in both `NotificationChannels.java` and `src/lib/muezzins.ts`.

## Scheduling

- Times: `adhan` library, Umm al-Qura by default, standard (Shafi'i/Maliki/Hanbali) Asr by default, Hanafi selectable. Isha is 90 min after Maghrib and **120 min in Ramadan** (Umm al-Qura convention; the library leaves this to the app). The day is the device's calendar day; the library returns absolute instants, so no UTC+3 offset is assumed anywhere in native scheduling.
- IDs: `1000 + (day number mod 90) × 10 + prayer index (+5 for the early alert)`. Scheduling the same prayer again replaces it. 1990 = refresh notice. Legacy test ID 1991 is removed on sync.
- Window: 7 days. On iOS it shrinks to fit the 64-pending limit (5 days with early alerts on), keeping room for the 5 daily reminders.
- Sync (`syncPrayerNotifications`): plans, cancels pending prayer IDs that are no longer wanted (location, madhab, method, prayers, sound, snooze or disable changed), and schedules only new or changed ones. Calls are queued so they never interleave.
- A timed snooze skips alerts until it ends; "until manual resume" cancels them all.
- Reboot: iOS keeps pending notifications. Android restores them from the plugin's storage (`LocalNotificationRestoreReceiver`); patched to drop alerts more than 10 minutes late.
- App update: iOS keeps pending notifications. Whether Android keeps the alarms across an update has not been verified on a device; the app reschedules everything on its next start either way.
- Without opening the app nothing can extend the window: on the last scheduled day a notice asks the user to open مصحفك.

## Android exact alarms and battery

- `SCHEDULE_EXACT_ALARM` is declared. On Android 14+ it is off by default for new installs; the Adhan settings screen shows "السماح بالتنبيه في الوقت الدقيق" and opens the system page. Without it alarms are inexact (allowed while idle) and may be several minutes late.
- `USE_EXACT_ALARM` is not used (Play restricts it to alarm-clock and calendar apps).
- Doze allows `setExactAndAllowWhileIdle`. Some manufacturers (for example Xiaomi, Huawei, Oppo) add their own battery killers; users may need to set the app to "unrestricted" battery use. The app does not request a battery-optimisation exemption (restricted on Play).

## Patched dependency

`patches/@capacitor__local-notifications@8.1.0.patch` (applied by `pnpm install`, Android code only):
1. `LocalNotificationRestoreReceiver`: after boot, a one-time alert more than 10 min overdue is deleted instead of fired.
2. `TimedNotificationPublisher`: repeating daily reminders are re-armed with `setExactAndAllowWhileIdle(RTC_WAKEUP)` instead of `setExact(RTC)`.

When upgrading the plugin, check whether these are still needed and regenerate the patch.

## Diagnostics

Adhan settings → "حالة التنبيهات" (native app only): notification permission, exact-alarm
status (Android), device time zone, today's calculated times, and the pending prayer
notifications with ID, scheduled time and prayer time. The production test-alert action has been removed. Coordinates are never shown or
logged; development builds log only counts.

## Must be verified on a real phone

Automated tests run the calculation and scheduling logic and the web UI. They cannot prove
what the OS does. Check on a physical iPhone and Android phone:

1. A scheduled prayer notification plays the adhan clip (iOS) / full adhan (Android), screen locked and unlocked.
2. "صوت الجهاز" plays the system sound (iOS relies on the plugin's documented fallback for the name `"default"`).
3. Silent switch / Focus / DND silence it as expected; Bluetooth/headphones route as for any notification.
4. A prayer alert arrives at the minute shown (Android: with and without exact-alarm permission, phone idle for an hour).
5. Tapping a prayer alert on iOS opens the Prayer tab and plays the full adhan once; on Android it opens the tab without replaying.
6. Reboot the phone: no burst of old alerts; the next prayer still fires.
7. Install the update over the current TestFlight build: bookmarks, khatmah, tasbeeh and prayer settings are all still there.
