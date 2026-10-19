import { defineConfig, devices } from "@playwright/test";

// End-to-end checks of the redesigned app shell and local features. The Quran API
// is mocked in e2e/mockApi.ts with placeholder text, so these tests never show
// or depend on real Quran text and need no network.

const PORT = 5199;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    ...devices["iPhone 13"],
    browserName: "chromium",
    baseURL: `http://localhost:${PORT}`,
    locale: "ar",
    timezoneId: "Asia/Riyadh",
  },
  webServer: {
    command: "pnpm exec vite --config vite.config.ts --port " + PORT + " --strictPort",
    env: { PORT: String(PORT), BASE_PATH: "/" },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
