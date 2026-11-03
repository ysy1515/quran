import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    // Prayer-time tests use Saudi locations with a device in the same zone, as in real use.
    // (The calculation day is the device's calendar day; see prayer.ts.)
    env: { TZ: "Asia/Riyadh" },
  },
});
