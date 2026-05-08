# Mobile Deployment Guide — القرآن الكريم

App ID: `com.yahya.quran`  
App Name: `القرآن الكريم`  
Framework: Capacitor 8 + React + Vite

---

## Architecture Overview

```
artifacts/quran/
├── capacitor.config.ts        ← Capacitor config (App ID, name, webDir)
├── vite.config.mobile.ts      ← Mobile-specific Vite build (no Replit env needed)
├── index.mobile.html          ← Mobile HTML entry point
├── src/main.mobile.tsx        ← Mobile entry (sets API base URL)
├── mobile-assets/             ← Source icons and splash images
│   └── README.md              ← Icon/splash generation instructions
├── android/                   ← Android native project (after cap add android)
└── ios/                       ← iOS native project (after cap add ios)
```

The Replit web deployment (`vite.config.ts` + `dist/public/`) is completely
separate and unaffected by the mobile build.

---

## Prerequisites (on your local machine)

### For Android
- [Node.js 18+](https://nodejs.org)
- [pnpm](https://pnpm.io): `npm install -g pnpm`
- [Android Studio](https://developer.android.com/studio) (includes JDK 17 + Android SDK)
- Android SDK Platform 34+ installed via Android Studio → SDK Manager

### For iOS (macOS only)
- macOS with Xcode 15+
- Apple Developer account ($99/year)
- CocoaPods: `sudo gem install cocoapods`

---

## Step 1 — Clone and Install

```bash
git clone https://github.com/ysy1515/quran.git
cd quran
pnpm install
```

---

## Step 2 — Set the Production API URL

Edit `artifacts/quran/src/main.mobile.tsx` and replace the placeholder:

```ts
const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "https://your-replit-app.replit.app";   // ← replace this
```

Or create `artifacts/quran/.env.mobile`:

```env
VITE_API_BASE_URL=https://your-actual-replit-app.replit.app
```

Then pass it to the build:

```bash
VITE_API_BASE_URL=https://your-actual-replit-app.replit.app \
  pnpm --filter @workspace/quran build:mobile
```

---

## Step 3 — Initialize Native Platforms (first time only)

Run from the `artifacts/quran/` directory:

```bash
cd artifacts/quran

# Add Android platform
npx cap add android

# Add iOS platform (macOS only)
npx cap add ios
```

---

## Step 4 — Configure RTL for Android

After `cap add android`, apply RTL settings:

### `android/app/src/main/res/values/strings.xml`
```xml
<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">القرآن الكريم</string>
    <string name="title_activity_main">القرآن الكريم</string>
    <string name="package_name">com.yahya.quran</string>
    <string name="custom_url_scheme">com.yahya.quran</string>
</resources>
```

### `android/app/src/main/AndroidManifest.xml` — add to `<application>`:
```xml
android:supportsRtl="true"
```

Full `<application>` opening tag example:
```xml
<application
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:supportsRtl="true"
    android:theme="@style/AppTheme">
```

---

## Step 5 — Generate App Icons & Splash Screen

Place source files in `artifacts/quran/mobile-assets/` (see `mobile-assets/README.md`),
then from `artifacts/quran/`:

```bash
npx @capacitor/assets generate \
  --iconBackgroundColor '#1a4731' \
  --splashBackgroundColor '#1a4731'
```

---

## Step 6 — Build & Sync

```bash
# From project root (quran/ monorepo root):
pnpm --filter @workspace/quran mobile:android   # build + sync Android
pnpm --filter @workspace/quran mobile:ios        # build + sync iOS (macOS only)

# Or from artifacts/quran/:
pnpm build:mobile   # builds to dist/mobile/
npx cap sync        # copies dist/mobile/ to native platforms
```

---

## Android — Release Build (.aab for Play Store)

### Option A: Android Studio (recommended)
```bash
npx cap open android   # opens Android Studio
```
In Android Studio:
1. **Build → Generate Signed Bundle/APK**
2. Choose **Android App Bundle (.aab)**
3. Create or select your keystore
4. Select **release** build variant
5. Upload the generated `.aab` to [Google Play Console](https://play.google.com/console)

### Option B: Command Line
```bash
cd artifacts/quran/android
./gradlew bundleRelease
```
Output: `app/build/outputs/bundle/release/app-release.aab`

### Signing (required for release)
```bash
keytool -genkey -v \
  -keystore quran-release.keystore \
  -alias quran \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Add to `android/app/build.gradle`:
```groovy
android {
  signingConfigs {
    release {
      storeFile file('../../quran-release.keystore')
      storePassword 'YOUR_STORE_PASSWORD'
      keyAlias 'quran'
      keyPassword 'YOUR_KEY_PASSWORD'
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
  }
}
```

---

## iOS — TestFlight / App Store Build

### Option A: Xcode (manual)
```bash
npx cap open ios   # opens Xcode
```
In Xcode:
1. Select **App** target → **Signing & Capabilities**
2. Set **Bundle Identifier**: `com.yahya.quran`
3. Select your **Apple Developer Team**
4. Enable **Automatic signing**
5. **Product → Archive**
6. In **Organizer**, click **Distribute App → TestFlight & App Store**

### Option B: Codemagic CI/CD (recommended for automation)

Create `codemagic.yaml` in project root:

```yaml
workflows:
  ios-release:
    name: iOS Release
    environment:
      groups:
        - app_store_credentials
      vars:
        BUNDLE_ID: com.yahya.quran
    scripts:
      - name: Install dependencies
        script: |
          cd artifacts/quran
          pnpm install
          pnpm build:mobile
          npx cap sync ios
          cd ios/App && pod install
      - name: Build IPA
        script: |
          xcode-project build-ipa \
            --workspace artifacts/quran/ios/App/App.xcworkspace \
            --scheme App
    artifacts:
      - build/ios/ipa/*.ipa
    publishing:
      app_store_connect:
        api_key: $APP_STORE_CONNECT_PRIVATE_KEY
        key_id: $APP_STORE_CONNECT_KEY_IDENTIFIER
        issuer_id: $APP_STORE_CONNECT_ISSUER_ID
        submit_to_testflight: true
```

---

## Google Play Store Checklist

- [ ] App ID registered: `com.yahya.quran`
- [ ] Keystore file created and backed up securely
- [ ] `.aab` release bundle generated
- [ ] App title (Arabic): القرآن الكريم
- [ ] Short description (≤80 chars)
- [ ] Full description
- [ ] Screenshots: phone (2–8), tablet optional
- [ ] Feature graphic: 1024×500 px
- [ ] Privacy policy URL (required)
- [ ] Content rating questionnaire completed
- [ ] Target audience: All ages (religious content)

---

## Apple App Store Checklist

- [ ] Apple Developer account ($99/year)
- [ ] Bundle ID registered in App Store Connect
- [ ] App record created in App Store Connect
- [ ] IPA built and uploaded via Xcode / Codemagic
- [ ] App category: Reference → Books (or Education)
- [ ] Arabic metadata: name, subtitle, description
- [ ] Screenshots for iPhone 6.7" and 6.5" (required)
- [ ] iPad screenshots (if iPad support enabled)
- [ ] Privacy policy URL
- [ ] Export compliance: No encryption used → **No**
- [ ] Content rights: Quran text is public domain

---

## Notes & Risks

| Risk | Mitigation |
|---|---|
| API calls fail on device | Set `VITE_API_BASE_URL` to your deployed Replit URL in the mobile build |
| Push notifications (web) | Web Push API is not supported in Capacitor WebViews — use `@capacitor/push-notifications` plugin for native push |
| Adhan audio on iOS | iOS requires user interaction before audio plays; existing tap-to-play pattern is already compliant |
| Geolocation on iOS | Requires `NSLocationWhenInUseUsageDescription` in `Info.plist` (Capacitor adds this automatically) |
| Google Fonts offline | Fonts load from CDN; add a local fallback in `index.css` for offline use |
| RTL support iOS | iOS WebView handles RTL via HTML `dir="rtl"` attribute — already set in `index.mobile.html` |
| App Store review | Quran apps require a clean UI and no misleading metadata; avoid excessive keywords |

---

## Keeping Web + Mobile in Sync

- Web build: `pnpm --filter @workspace/quran build` → `dist/public/` (Replit serves this)
- Mobile build: `pnpm --filter @workspace/quran build:mobile` → `dist/mobile/` (Capacitor reads this)
- Both builds share the same React source code — no duplication
- After any frontend change: rebuild both targets and run `npx cap sync`
