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
  },
  android: {
    backgroundColor: "#1a4731",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    backgroundColor: "#1a4731",
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: true,
  },
  server: {
    androidScheme: "https",
    iosScheme: "https",
    cleartext: false,
  },
};

export default config;
