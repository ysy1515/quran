# Mobile Debug and Release Notes
# القرآن الكريم — Capacitor iOS/Android Build

---

## Issues Fixed Before This Build

### Issue 0 — iOS Black Screen

**Root Cause (multiple combined):**

1. **`className` instead of `class` in `index.mobile.html`**
   `<html className="antialiased">` is JSX syntax, not valid HTML.
   In plain HTML the attribute must be `class`. The browser treated it as an unknown
   attribute so Tailwind's `antialiased` class was never applied, and — more
   importantly — the `html`/`body` had no inline background color.
   iOS WKWebView defaults to **black** in system Dark Mode, so a flash of black
   appeared before React mounted.

2. **Google Fonts loaded as a render-blocking stylesheet**
   `<link rel="stylesheet" href="https://fonts.googleapis.com/...">` in the `<head>`
   and `@import url('https://fonts.googleapis.com/...')` at the top of `index.css`
   both make the browser wait for an **external HTTPS request** before painting.
   In TestFlight on first launch (or in airplane mode) this blocked rendering entirely.

3. **No immediate background color**
   Before any CSS or JS loaded, the raw `<html>` and `<body>` had no background,
   so the dark WKWebView background showed through as a black screen.

4. **No React Error Boundary**
   Any unhandled exception during initial render silently unmounted the React tree,
   leaving an empty `<div id="root">` — the WKWebView shows black behind it.

5. **Service worker (`sw.js`) copied into the mobile build**
   The PWA service worker was included in `dist/mobile/` and synced to
   `ios/App/App/public/`. While Capacitor typically ignores it, it caused
   unpredictable behavior on some iOS WebView configurations.

**Fixes Applied:**

| File | Change |
|---|---|
| `artifacts/quran/index.mobile.html` | Fixed `className` → `class`; added inline critical CSS setting `background-color: #0f2a1a` on `html, body`; added `<div id="app-loading">` overlay visible before React mounts; made Google Fonts **non-blocking** via `rel="preload"` + `onload`; added `<meta name="theme-color">`, `<meta name="color-scheme">`, `<meta name="apple-mobile-web-app-status-bar-style">` |
| `artifacts/quran/src/main.mobile.tsx` | Added `ErrorBoundary` class component showing Arabic error UI; wrapped `createRoot().render()` in try/catch; hides `#app-loading` overlay after successful mount or on error |
| `artifacts/quran/src/App.tsx` | Added `onMounted` prop; calls `onMounted()` in `useEffect` so the HTML loading overlay is removed as soon as React renders successfully |
| `artifacts/quran/vite.config.mobile.ts` | Plugin now **deletes `sw.js`** from `dist/mobile/` after build, preventing it from being synced to iOS/Android |

---

### Issue 1 — Wrong / Missing Adhan Audio

**Root Cause:**
The `Adhan.tsx` page was referencing placeholder or Quran-recitation audio for muezzin previews instead of actual adhan MP3 files. Audio files are NOT bundled in the repository.

**Fix Applied (previous session):**
- `artifacts/quran/src/pages/Adhan.tsx` — all muezzin entries now point to local paths:
  `public/audio/adhan/{id}.mp3`
- If the file is absent, the UI shows `"ملف الأذان غير متوفر حالياً"` and disables playback
- No fallback Quran/basmalah audio is played

**⚠️ Manual Step Required:**
Upload real adhan MP3 files to:
```
artifacts/quran/public/audio/adhan/
```
Expected filenames (one per muezzin ID):
```
1.mp3   2.mp3   3.mp3   4.mp3   5.mp3   6.mp3
7.mp3   8.mp3   9.mp3  10.mp3  11.mp3  12.mp3
13.mp3  14.mp3  15.mp3  16.mp3  17.mp3
```
After uploading, run:
```bash
pnpm build:mobile && npx cap sync ios && npx cap sync android
```
The files will be included under:
- `dist/mobile/audio/adhan/`
- `ios/App/App/public/audio/adhan/`
- `android/app/src/main/assets/public/audio/adhan/`

---

### Issue 2 — Quran/Mushaf Fails in TestFlight

**Root Cause:**
The mobile build was using a placeholder URL `https://your-replit-app.replit.app`
(or empty) as the API base. In Capacitor, relative API paths resolve to
`https://localhost/api/...` which is not a real server — so all data fetches failed
with a network error, showing "تعذر تحميل الآيات".

**Fix Applied:**
- `artifacts/quran/.env.mobile`:
  ```
  VITE_API_BASE_URL=https://quran.yahya.app
  ```
- `artifacts/quran/vite.config.mobile.ts` bakes this into the bundle as
  `__MOBILE_API_BASE_URL__` via Vite `define`.
- `artifacts/quran/src/main.mobile.tsx` calls `setBaseUrl("https://quran.yahya.app")`
  before mounting React, so all API calls use the production backend.

**Verification:**
```bash
grep -o '"https://quran.yahya.app"' dist/mobile/assets/index.mobile-*.js
# Should print: "https://quran.yahya.app"
```

---

### Issue 3 — Notifications Show "Unsupported Browser" Inside Native App

**Root Cause:**
`usePushNotifications.ts` checked `"Notification" in window` and
`"PushManager" in window` to detect support. Capacitor iOS WKWebView does
NOT expose the Web Push API, so the hook fell through to `status = "unsupported"`.
The Settings page then showed "غير مدعوم في هذا المتصفح".

**Fix Applied (previous session):**
- `artifacts/quran/src/hooks/usePushNotifications.ts` — added `isCapacitorNative()`
  check using `window.Capacitor?.isNativePlatform()`. When running natively,
  `status` is set to `"native"` immediately.
- `artifacts/quran/src/pages/Settings.tsx` — when `status === "native"`, shows
  "الإشعارات متاحة عبر التطبيق" and links to the Adhan page for local notification
  settings via `@capacitor/local-notifications`.

---

## Build Commands

```bash
# 1. From repository root:
pnpm install

# 2. From artifacts/quran:
cd artifacts/quran
pnpm build:mobile
npx cap sync ios
npx cap sync android
```

---

## Deployment Checklist

After every code change:

```bash
git add .
git commit -m "fix: mobile build improvements"
git push
```

Then:
1. Trigger a new **Codemagic** build
2. Download the resulting `.ipa`
3. Upload to **TestFlight** via App Store Connect or Transporter
4. Test on a real device from TestFlight

---

## Debugging iOS in Production (Safari Web Inspector)

1. Connect iPhone to Mac via USB
2. On iPhone: **Settings → Safari → Advanced → Web Inspector → ON**
3. Open Safari on Mac → **Develop menu → [your iPhone] → App WebView**
4. Full DevTools available: Console, Network, Sources, etc.

This is the only way to see JS errors from a TestFlight build.

---

## Files Changed in This Session

```
artifacts/quran/index.mobile.html          — black screen fixes
artifacts/quran/src/main.mobile.tsx        — ErrorBoundary + loading overlay
artifacts/quran/src/App.tsx                — onMounted prop
artifacts/quran/vite.config.mobile.ts      — remove sw.js from mobile build
artifacts/quran/.env.mobile                — VITE_API_BASE_URL=https://quran.yahya.app
```

---

## Build Verification Results (Last Build)

| Check | Result |
|---|---|
| `pnpm build:mobile` | ✅ Success |
| `dist/mobile/index.html` exists | ✅ |
| `dist/mobile/sw.js` absent | ✅ Removed |
| `class="antialiased"` (not `className`) | ✅ Fixed |
| `"https://quran.yahya.app"` in bundle | ✅ |
| No placeholder URLs in bundle | ✅ |
| `npx cap sync ios` | ✅ Success |
| `npx cap sync android` | ✅ Success |
| iOS `index.html` has dark green background | ✅ Inline CSS |
| TypeScript | ✅ No errors |
