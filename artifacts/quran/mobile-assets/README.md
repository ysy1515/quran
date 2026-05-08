# Mobile Assets — Icon & Splash Screen

Place your source images in this folder before running the asset generator.

## Required Source Files

| File | Size | Purpose |
|---|---|---|
| `icon/icon.png` | 1024×1024 px | App icon (no alpha/transparency) |
| `icon/icon-foreground.png` | 1024×1024 px | Android adaptive icon foreground |
| `icon/icon-background.png` | 1024×1024 px | Android adaptive icon background |
| `splash/splash.png` | 2732×2732 px | Splash screen (centered logo) |

## Recommended Design

- **Background color**: `#1a4731` (deep green)
- **Icon**: White/gold Arabic calligraphy of "ق" (Qaf) on green
- **Splash**: Same "ق" logo centered on green background

## Generate All Sizes Automatically

Install the asset generator (run once, in the `artifacts/quran/` folder):

```bash
npm install -g @capacitor/assets
```

Then generate all icon and splash sizes:

```bash
# From artifacts/quran/ directory:
npx @capacitor/assets generate \
  --iconBackgroundColor '#1a4731' \
  --iconBackgroundColorDark '#1a4731' \
  --splashBackgroundColor '#1a4731' \
  --splashBackgroundColorDark '#0f2d1e'
```

This auto-generates:
- Android: `android/app/src/main/res/mipmap-*/`  (all densities)
- Android adaptive icons: `mipmap-anydpi-v26/`
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Splash screens for both platforms

## Manual Sizes (if not using the generator)

### Android Icons
| Folder | Size |
|---|---|
| `mipmap-mdpi` | 48×48 |
| `mipmap-hdpi` | 72×72 |
| `mipmap-xhdpi` | 96×96 |
| `mipmap-xxhdpi` | 144×144 |
| `mipmap-xxxhdpi` | 192×192 |

### iOS Icons
iOS requires many sizes — use Xcode's asset catalog or a tool like
[makeappicon.com](https://makeappicon.com) or [appicon.co](https://appicon.co).
