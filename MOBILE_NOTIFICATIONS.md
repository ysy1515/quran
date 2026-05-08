# Mobile Notifications — القرآن الكريم

## What Was Implemented

### 1. Local Notifications (Primary — Prayer Reminders)
Implemented via `@capacitor/local-notifications`. This is the **recommended approach** for prayer-time reminders because:
- Works **offline** — no server required
- Fires **exactly on time** using the device's clock
- Uses the on-device prayer time calculation (same `adhan` library as the UI)
- Supports scheduling for **today + tomorrow** (refreshed daily on app open)

Hook: `artifacts/quran/src/hooks/useLocalNotifications.ts`

### 2. Web Push Notifications (Secondary — Remote Announcements)
Already implemented via VAPID/Web Push (`@capacitor/push-notifications` base).
- Used for server-triggered announcements
- Device tokens registered via `POST /api/notifications/register-device`
- Requires Firebase (Android) or APNs (iOS) for native push

---

## Notification Flow

```
User opens Adhan page
        ↓
Taps "تفعيل" → requestLocalPermission()
        ↓
Permission granted → schedulePrayers(coords, prefs)
        ↓
LocalNotifications.schedule() called for today + tomorrow
        ↓
On each app open: reschedule (idempotent, cancels old + creates new)
        ↓
Notification fires at prayer time - reminderMinutes
```

---

## Notification Settings (in Adhan Page)

| Setting | Description |
|---|---|
| تفعيل / إيقاف | Master toggle for all prayer reminders |
| Per-prayer toggles | Enable/disable each prayer individually |
| تذكير قبل الصلاة | 0 / 5 / 10 / 15 minutes before |
| اختيار المؤذن | Stored in preferences, affects in-app audio preview |
| إيقاف مؤقت | Snooze 3/5/7 days or until manually resumed |

---

## API Endpoints Added

| Endpoint | Method | Description |
|---|---|---|
| `/api/notifications/register-device` | POST | Register native device token |
| `/api/notifications/update-preferences` | POST | Update prayer prefs for a device |
| `/api/notifications/unregister-device` | DELETE | Remove a device token |

### Register Device Body
```json
{
  "token": "FCM_OR_APNS_TOKEN",
  "platform": "android",
  "deviceId": "UNIQUE_DEVICE_ID",
  "enabledPrayers": ["fajr", "dhuhr", "asr", "maghrib", "isha"],
  "muezzinId": "haram-ali-mulla",
  "reminderMinutes": 10,
  "locationLat": 21.3891,
  "locationLng": 39.8579,
  "locationName": "مكة المكرمة",
  "calcMethod": "UmmAlQura",
  "madhab": "Hanafi"
}
```

---

## Android Setup

### 1. Firebase (required for remote push only)
If you want server-side push notifications (not needed for local notifications):

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project → Add Android app → package: `com.yahya.quran`
3. Download `google-services.json`
4. Place it at: `artifacts/quran/android/app/google-services.json`
5. Add to `android/build.gradle`:
   ```gradle
   classpath 'com.google.gms:google-services:4.4.0'
   ```
6. Add to `android/app/build.gradle`:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```

### 2. Notification Channel (auto-created by Capacitor)
Channel ID: `prayer-reminders`
Channel name: **تنبيهات الصلاة**
Channel description: **تنبيهات مواقيت الصلاة والأذان**

### 3. Custom Notification Sound
Place `.mp3` or `.wav` files in:
```
artifacts/quran/android/app/src/main/res/raw/
```
Example: `prayer_tone.mp3`

Then reference in the notification schedule:
```ts
sound: "prayer_tone"  // without extension
```

### 4. Permissions (already in AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
```

### 5. Android 13+ POST_NOTIFICATIONS
Capacitor LocalNotifications handles the runtime permission request automatically when you call `requestPermissions()`.

---

## iOS Setup

### 1. APNs Capability (required for remote push only)
1. In Xcode: Project → Target (App) → Signing & Capabilities
2. Click **+ Capability** → **Push Notifications**
3. Also add **Background Modes** → check **Remote notifications**

### 2. APNs Key (for server-side push)
1. [Apple Developer Console](https://developer.apple.com) → Keys → Create key
2. Enable **Apple Push Notifications service (APNs)**
3. Download the `.p8` key file — store it as `APNS_KEY` environment variable (never commit it)

### 3. Custom Notification Sound (iOS)
Place `.aiff`, `.wav`, or `.caf` files in Xcode project:
```
artifacts/quran/ios/App/App/
```
Add them to the Xcode target (Build Phases → Copy Bundle Resources).

### 4. Localized Permission Text (already in Info.plist)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>يستخدم التطبيق موقعك لحساب مواقيت الصلاة بدقة حسب مكانك</string>
```

### 5. TestFlight Testing
1. Archive the app in Xcode (Product → Archive)
2. Upload to App Store Connect
3. Add testers in TestFlight tab
4. Testers install via TestFlight app
5. Test notification permission → should prompt in Arabic

---

## Required Environment Variables

| Variable | Required For | Description |
|---|---|---|
| `VAPID_PUBLIC_KEY` | Web Push | VAPID public key |
| `VAPID_PRIVATE_KEY` | Web Push | VAPID private key |
| `VAPID_SUBJECT` | Web Push | mailto: or URL |
| `DATABASE_URL` | Both | PostgreSQL connection |

For local notifications, **no additional environment variables are needed** — everything runs on-device.

---

## Database Tables

### `device_tokens` (new)
Stores native device tokens for server-side push (optional):
```sql
id, token, platform, device_id, enabled_prayers,
muezzin_id, reminder_minutes, location_lat, location_lng,
location_name, calc_method, madhab, created_at, updated_at
```

### `push_subscriptions` (existing)
Web Push subscriptions (VAPID-based, for web users).

---

## Testing Checklist

### Browser / Replit Web Preview
- [ ] Adhan page loads without errors
- [ ] Prayer times calculate correctly with geolocation
- [ ] Muezzin audio plays on tap (not autoplay)
- [ ] Audio error shows "ملف الصوت غير متوفر حالياً" if file fails
- [ ] Notification toggle shows browser Notification.requestPermission()
- [ ] Reminder minutes selector saves to localStorage

### Android Emulator / Device
- [ ] `pnpm --filter @workspace/quran mobile:android` runs without error
- [ ] Open in Android Studio → Run on emulator/device
- [ ] App launches with splash screen (green #1a4731)
- [ ] Prayer times work (emulator geolocation may need manual coords)
- [ ] Tapping "تفعيل" requests POST_NOTIFICATIONS permission (Android 13+)
- [ ] Notification appears at scheduled time
- [ ] Notification dismisses correctly
- [ ] Background notifications work

### iOS TestFlight
- [ ] CocoaPods install: `cd ios/App && pod install`
- [ ] Archive and upload to TestFlight
- [ ] Install via TestFlight
- [ ] Permission dialog appears in Arabic
- [ ] Local notification fires at correct prayer time
- [ ] Notification sound plays

### Permission Denied Case
- [ ] App does not crash when permission is denied
- [ ] Shows fallback message: "لم يتم منح إذن الإشعارات"
- [ ] "تفعيل" button still visible to retry

### Permission Granted Case
- [ ] Notifications are scheduled for today + tomorrow
- [ ] Schedule updates when prayer preferences change
- [ ] Old schedule is cancelled before new one is created

### Token Registration (if using remote push)
- [ ] `POST /api/notifications/register-device` returns 200
- [ ] No duplicate tokens in `device_tokens` table (upsert on conflict)
- [ ] `DELETE /api/notifications/unregister-device` removes token

---

## Known Platform Limitations

| Limitation | Platform | Note |
|---|---|---|
| Full adhan audio in background | iOS | iOS kills background audio after ~30s; use short notification sounds |
| Full adhan audio in background | Android | Works on most Android versions with `FOREGROUND_SERVICE` |
| LocalNotifications in WebView | Web | Falls back to browser Notification API |
| Notification scheduling limit | iOS | iOS may not fire notifications more than ~64 in the future |
| Quiet hours (Focus/DND) | Both | System DND overrides app notifications |
| Battery optimization | Android | Some OEM ROMs (Xiaomi, Huawei) kill background services |

### Recommended for users experiencing missed notifications (Android)
Tell them: Settings → Apps → القرآن الكريم → Battery → "Unrestricted"

---

## App Store / Google Play Notes

### Google Play
- Notification permission: Declare usage in Play Console → App content
- Target API 34+: `POST_NOTIFICATIONS` runtime permission handled by Capacitor

### Apple App Store
- Must declare notification usage in App Store Connect privacy questionnaire
- No special entitlements needed for local notifications
- For remote push: must add Push Notifications entitlement before submission
