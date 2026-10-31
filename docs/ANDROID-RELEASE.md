# Android release on Google Play — مصحفك

The Android app is the same React + Capacitor 8 app as iOS (`artifacts/quran/android`).
Nothing here changes the iOS project, its bundle ID or the TestFlight workflows.

## Project facts

| Item | Value |
|---|---|
| Application ID | `com.yahya.quran` (unchanged; the same as the iOS bundle ID) |
| Display name | مصحفك (`res/values/strings.xml`) |
| minSdk / compileSdk / targetSdk | 24 / 36 / 36 (Android 16; Play requires target 36 for new apps from 31 Aug 2026) |
| Build tools | Android Gradle Plugin 8.13, Gradle 8.14.3, Java 21 |
| Version | `versionName` 1.0.5 (same as iOS), `versionCode` from Codemagic (see below) |
| Plugins | haptics, local-notifications (patched, see `MOBILE_NOTIFICATIONS.md`), preferences, status-bar |
| Icon | Adaptive icon from the approved brand (open Mushaf + Rub el Hizb on deep green); legacy and round icons from `docs/brand/app-icon-1024.png` |
| Splash | Brand splash (same artwork as iOS) |
| Notification icon | `res/drawable/ic_stat_mushafak.xml` (white silhouette) |
| RTL | `android:supportsRtl="true"`; the web layer sets `dir="rtl"` |
| Network | HTTPS only (`cleartext: false`, `androidScheme: https`) |
| Deep links | None. Notification taps open in-app routes from an allowlist (`notificationRoute.ts`) |

### Permissions and why

| Permission | Why | Play notes |
|---|---|---|
| `INTERNET` | Quran text, tafsir, search from the app's API | — |
| `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION` | Prayer times for the user's location (only when the user taps "تحديد") | Foreground only. No background location. |
| `POST_NOTIFICATIONS` | Prayer alerts and daily reminders (Android 13+ asks at runtime) | — |
| `SCHEDULE_EXACT_ALARM` | Prayer alerts at the exact minute | User-granted in Settings; no declaration form. The app works without it (inexact). |
| `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK` | Restore scheduled alerts after a reboot (from the notifications plugin) | — |
| `VIBRATE` | Notification vibration | — |

Not used: `USE_EXACT_ALARM`, background location, foreground services, full-screen intents,
`REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`, Firebase/FCM.

## Builds (Codemagic)

Two new workflows in `codemagic.yaml`, both started by hand; the iOS workflows are unchanged:

- **`android-verify-build`**: install, typecheck, unit tests, web build, `cap sync android`,
  `bundleRelease` without signing. Needs no secrets. Run it first on this branch.
- **`android-release`**: the same, signed with your upload keystore, producing
  `app-release.aab` as a build artifact. It uploads nothing.

Version code: Codemagic's `BUILD_NUMBER` for the workflow (it only grows). If a Google Play
service account is later added as `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`, the workflow uses the
next number after the highest one on Play when that is larger. Bump `ANDROID_VERSION_NAME` in
`codemagic.yaml` together with the iOS `APP_VERSION` for each release.

Signing: `app/build.gradle` reads `CM_KEYSTORE_PATH`, `CM_KEYSTORE_PASSWORD`, `CM_KEY_ALIAS`,
`CM_KEY_PASSWORD` (set by Codemagic's `android_signing`), or an untracked
`android/keystore.properties` for local builds. Keystores and passwords are never committed
(`*.jks`, `*.keystore`, `keystore.properties` are git-ignored).

## What you need to do, in order

Steps marked 💳 cost money, 🔑 need secrets, ✋ need your approval or identity.

1. **Run `android-verify-build` on this branch in Codemagic** and check it is green. (Before merging.)
2. **Create the Google Play developer account** 💳✋ at play.google.com/console: one-time US$25
   fee, a Google account, and identity verification (government ID; for an organisation
   account also a D-U-N-S number). Choose **Personal** unless you have a registered company:
   the public pages name the operator as «مطوّر تطبيق مصحفك», and Play shows the developer
   name you verify.
3. **Personal accounts created after Nov 2023 must run a closed test** before production:
   at least 12 testers opted in for 14 continuous days. Recruit testers early (family/friends
   with Android phones and Gmail addresses).
4. **Create the upload keystore** 🔑 (once, on your computer; keep two backups and the passwords
   in a password manager — losing it means asking Google to reset the upload key):
   ```bash
   keytool -genkeypair -v -keystore mushafak-upload.jks -alias mushafak \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
5. **Upload it to Codemagic** 🔑: Team settings → Code signing identities → Android keystores →
   upload `mushafak-upload.jks`, enter the passwords and alias, reference name
   **`mushafak_upload_keystore`**.
6. **Create the app in Play Console** ✋: name «مصحفك – القرآن الكريم والأذكار» (Play allows 30
   characters), default language Arabic, App, Free.
7. **Run `android-release`** ✋ and download `app-release.aab` from the build artifacts.
8. **Play App Signing**: keep the default (Google holds the app signing key; your keystore is
   the upload key). Upload the `.aab` to **Testing → Internal testing**, add yourself as a
   tester, install from the opt-in link, and do the phone checks in `MOBILE_NOTIFICATIONS.md`.
9. **Store listing**: short description (80 chars), full description, 512×512 icon
   (`docs/brand/app-icon-1024.png` scaled), 1024×500 feature graphic, at least 2 phone
   screenshots (1080×1920 or similar). Texts can follow `docs/STORE-METADATA.md`.
10. **App content** (Policy → App content):
    - Privacy policy URL: `https://quran.yahya.app/privacy`
    - Ads: No ads.
    - App access: all functionality available without login.
    - Content rating: IARC questionnaire, category Reference/Education; no violence, no user
      content sharing, no purchases → expected rating Everyone / 3+.
    - Target audience: 13+ (choose 18+ only if you prefer to avoid the Families policy; do not
      select under-13 groups unless you want the app in the Families programme).
    - Data safety: see below.
    - Exact alarm: no form is needed for `SCHEDULE_EXACT_ALARM`; if Play asks, state "prayer-time
      alerts at the calculated minute, user-enabled".
11. **Closed testing** (if required, step 3): promote the internal build to a closed track,
    add the 12+ testers, wait 14 days, then apply for production access.
12. **Production** ✋: create the production release from the tested build, roll out (start at
    20% if you like), and send for review. Nothing is published until you press this.

## Data safety form (matches the Apple App Privacy answers)

- Data collected: **Yes**.
  - **Location → Precise location**: collected, not shared for advertising; purpose App
    functionality; optional (only when the user taps "تحديد" for GPS; the manual city list sends
    nothing). Reason: GPS coordinates are sent to OpenStreetMap Nominatim to show the city name.
  - **App activity → App interactions**: collected; App functionality; the API server logs
    which surah/page/tafsir was requested (no identifier, kept 30 days by the host).
- Shared with third parties: No (Nominatim processes the request as a service provider).
- Encrypted in transit: Yes. Users can request deletion: Yes (support email); no account exists.
- Personal data on the device (bookmarks, khatmah, tasbeeh, settings) never leaves the phone
  and is not "collected".
Re-check this if the Nominatim call or the server logging changes.
