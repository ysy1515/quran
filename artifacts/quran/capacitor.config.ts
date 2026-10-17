import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.yahya.quran",
  appName: "القرآن الكريم",
  webDir: "dist/mobile",
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#1a4731",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      iosSpinnerStyle: "small",
      spinnerColor: "#a3e4c1",
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#1a4731",
      sound: "default",
    },
  },
  android: {
    backgroundColor: "#1a4731",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    backgroundColor: "#1a4731",
    // The web layer draws edge to edge and pads itself with env(safe-area-inset-*).
    contentInset: "never",
    limitsNavigationsToAppBoundDomains: true,
  },
  server: {
    androidScheme: "https",
    iosScheme: "https",
    cleartext: false,
  },
};

export default config;
