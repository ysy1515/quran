# App review and juz-based wird labels

The iOS rating row previously had an empty App Store URL and only showed a
coming-soon message. It now opens app `6767634410` with `action=write-review`
through UIApplication. The persistent web link points to the same page. Android
keeps its existing behavior until a real Play Store URL is configured.

Automatic iOS review requests use StoreKit, not a custom rating dialog. The
first request is eligible after seven days, three distinct active days and ten
minutes of recorded visible Quran reading. Requests run after four seconds on
the visible home screen and are cancelled when navigating away or hiding the
app. A request is attempted no more than once per 120 days and three times in a
rolling year. Opening the store manually suppresses automatic attempts for one
year. Activity and cooldowns use the existing native Preferences persistence.

Apple decides whether to display the request and does not expose whether the
person rated the app. The app records attempts and successful store openings,
never a fictional `rated` flag. Apple does not display the automatic request in
TestFlight; use an Xcode development build to test its actual appearance. The
manual App Store link remains available in TestFlight.

The app-owned Capacitor plugin is registered by `AppViewController` in the main
storyboard. Its Swift classes live in the existing compiled AppDelegate source,
and no new external package is required. It uses the active window scene and
supports the existing legacy AppDelegate window lifecycle.

Sources:
- https://developer.apple.com/documentation/storekit/requesting-app-store-reviews
- https://developer.apple.com/documentation/storekit/skstorereviewcontroller/requestreview()

## Wird labels

The four existing choices now read eighth, quarter, half and full juz. Their
internal IDs and sizes remain unchanged: 1, 2, 4 and 8 hizb quarters, producing
240, 120, 60 and 30 portions for a full Quran plan. The current-wird page also
shows the selected amount. Existing plans, progress and ayah boundaries are
preserved; the existing gap/overlap tests still cover all four plans.

## Verification and release checks

The complete local run passed 155 unit tests and 45 Playwright tests.

- Unit tests cover review eligibility, duplicate-day counting, cooldowns,
  annual cap, platform restrictions, native failure and durable restoration.
- UI tests exercise the real Capacitor JS proxy with a mocked OS bridge for the
  manual store action, automatic request and reload suppression, all reminder
  switches, test alerts, and prayer schedule/cancellation.
- UI tests check all four juz labels and counts and restore a quarter-juz plan.
- Mobile web-assets build, Quran TypeScript and changed-file ESLint checks pass.

Windows cannot compile UIKit/StoreKit. Run `ios-verify-build` in Codemagic before
release to compile the native plugin and storyboard. Verify the manual store
link and real notification sound/arrival on the installed iPhone build. The
mocked OS tests do not prove physical-device delivery or the StoreKit dialog.
