import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./mockApi";

// Exercise the real Capacitor JS proxy and UI, replacing only the OS bridge.
// These checks cannot prove delivery on a physical iPhone.
async function nativeBridge(page: Page, permission = "granted") {
  await page.addInitScript((display) => {
    sessionStorage.setItem("splash-shown", "1");
    const methods: Record<string, string[]> = {
      Preferences: ["get", "set"],
      LocalNotifications: ["requestPermissions", "checkPermissions", "getPending", "schedule", "cancel", "addListener", "removeListener"],
      StatusBar: ["setStyle"],
      AppReview: ["requestReview", "openStoreReview"],
      QiblaCompass: ["start", "read", "stop"],
    };
    Object.assign(window, {
      webkit: { messageHandlers: { bridge: {} } },
      Capacitor: {
        PluginHeaders: Object.entries(methods).map(([name, names]) => ({
          name, methods: names.map((name) => ({ name, rtype: "promise" })),
        })),
        nativePromise: async (plugin: string, method: string, options: Record<string, unknown> = {}) => {
          if (plugin === "QiblaCompass") {
            if (method === "read") return { valid: localStorage.getItem("compass-invalid") !== "1", heading: 319.28, accuracy: 3, lat: 18.3, lng: 42.7333, locationAccuracy: 10 };
            localStorage.setItem(`compass:${method}`, "1");
            return {};
          }
          if (plugin === "AppReview") {
            const key = `native:review:${method}`;
            localStorage.setItem(key, String(Number(localStorage.getItem(key) ?? 0) + 1));
            return { requested: true, opened: true };
          }
          if (plugin === "Preferences") {
            const key = `native:${options.key}`;
            if (method === "get") return { value: localStorage.getItem(key) };
            localStorage.setItem(key, String(options.value));
            return {};
          }
          if (plugin !== "LocalNotifications") return {};
          if (method === "checkPermissions" || method === "requestPermissions") return { display };
          type Notification = { id: number; [key: string]: unknown };
          let pending: Notification[] = JSON.parse(localStorage.getItem("native:pending") ?? "[]");
          if (method === "getPending") return { notifications: pending };
          const input = (options.notifications ?? []) as Notification[];
          if (method === "schedule" || method === "cancel") {
            pending = pending.filter((n) => !input.some((v) => v.id === n.id));
            if (method === "schedule") pending.push(...input);
            localStorage.setItem("native:pending", JSON.stringify(pending));
          }
          return { notifications: input };
        },
      },
    });
  }, permission);
  await mockApi(page);
}

test("native reminder switches enable, schedule, restore and disable", async ({ page }) => {
  await nativeBridge(page);
  await page.goto("/more");
  for (const id of ["wird", "morning", "evening", "mulk", "baqarah"]) {
    const toggle = page.getByTestId(`reminder-${id}`).getByRole("switch");
    await expect(toggle).toBeEnabled();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect(toggle).toBeEnabled();
  }
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("native:pending") ?? "[]").length)).toBe(5);
  await page.reload();
  for (const id of ["wird", "morning", "evening", "mulk", "baqarah"]) {
    const toggle = page.getByTestId(`reminder-${id}`).getByRole("switch");
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
  }
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("native:pending") ?? "[]"))).toEqual([]);
});

test("permission denial leaves the switch usable and explains the failure", async ({ page }) => {
  await nativeBridge(page, "denied");
  await page.goto("/more");
  const toggle = page.getByTestId("reminder-wird").getByRole("switch");
  await toggle.click();
  await expect(page.getByTestId("reminder-wird").getByRole("status")).toHaveText("لم يتم منح إذن الإشعارات، يرجى السماح من إعدادات الجهاز");
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await expect(toggle).toBeEnabled();
});

test("production settings remove the test alert and keep diagnostics", async ({ page }) => {
  await nativeBridge(page);
  await page.goto("/adhan/settings");
  await expect(page.getByTestId("test-notification")).toHaveCount(0);
  await page.getByTestId("load-diagnostics").click();
  await expect(page.getByTestId("diagnostics")).toBeVisible();
});

test("native prayer switch schedules audible alerts and cancels them when disabled", async ({ page }) => {
  await nativeBridge(page);
  await page.goto("/adhan/settings");
  await page.getByTestId("choose-city").click();
  await page.getByTestId("city-khamis-mushait").click();
  await page.getByTestId("adhan-enabled").click();
  await expect(page.getByTestId("adhan-enabled")).toHaveAttribute("aria-checked", "true");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("native:pending") ?? "[]").length)).toBeGreaterThan(20);
  const pending = await page.evaluate(() => JSON.parse(localStorage.getItem("native:pending") ?? "[]"));
  expect(pending.every((n: { sound: string; schedule: { at: string } }) => !!n.sound && new Date(n.schedule.at).getTime() > Date.now() - 10000)).toBe(true);
  await page.reload();
  await expect(page.getByTestId("adhan-enabled")).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("adhan-enabled").click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("native:pending") ?? "[]").length)).toBe(0);
});

test("rate app opens the native store review action and persists the cooldown", async ({ page }) => {
  await nativeBridge(page);
  await page.goto("/more");
  await page.getByRole("button", { name: "تقييم التطبيق" }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("native:review:openStoreReview"))).toBe("1");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("native:quran.review.v1") ?? "{}").manualOpenedAt)).toBeGreaterThan(0);
});

test("automatic review waits for established use and is not repeated after reload", async ({ page }) => {
  await nativeBridge(page);
  await page.addInitScript(() => {
    if (sessionStorage.getItem("review-seeded")) return;
    sessionStorage.setItem("review-seeded", "1");
    localStorage.setItem("native:quran.review.v1", JSON.stringify({ firstSeen: Date.now() - 8 * 86400000,
      activeDays: ["2026-10-20", "2026-10-21", "2026-10-22"], attempts: [], manualOpenedAt: null }));
    localStorage.setItem("native:quran.readingTime.v1", JSON.stringify({ seconds: 650, since: "2026-10-20T12:00:00Z" }));
  });
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("native:review:requestReview")), { timeout: 8000 }).toBe("1");
  await page.reload();
  await page.waitForTimeout(4500);
  expect(await page.evaluate(() => localStorage.getItem("native:review:requestReview"))).toBe("1");
});

test("qibla uses a fresh fix, hides unreliable readings and stops on exit", async ({ page }) => {
  await nativeBridge(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", { value: {
      getCurrentPosition: (success: (p: unknown) => void) => success({ coords: { latitude: 18.3, longitude: 42.7333, accuracy: 10 } }),
    } });
  });
  await page.goto("/more");
  await page.getByRole("link", { name: /القبلة/ }).click();
  await page.getByRole("button", { name: "تحديد موقعي وتشغيل القبلة" }).click();
  await expect(page.getByTestId("qibla-bearing")).toContainText("319.3");
  await expect(page.getByTestId("qibla-arrow")).toBeVisible();
  await expect(page.getByTestId("qibla-status")).toContainText("أنت باتجاه القبلة");
  await page.screenshot({ path: "node_modules/qibla-preview.png" });
  await page.evaluate(() => localStorage.setItem("compass-invalid", "1"));
  await expect(page.getByTestId("qibla-arrow")).toHaveCount(0);
  await page.getByRole("button", { name: "رجوع", exact: true }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("compass:stop"))).toBe("1");
});

test("Saudi calculation reset saves Umm al-Qura and standard Asr together", async ({ page }) => {
  await nativeBridge(page);
  await page.goto("/adhan/settings");
  await page.getByTestId("calc-method").selectOption("Egyptian");
  await page.getByRole("tab", { name: "حنفي", exact: true }).click();
  await page.getByTestId("saudi-calculation").click();
  await page.reload();
  await expect(page.getByTestId("calc-method")).toHaveValue("UmmAlQura");
  await expect(page.getByRole("tab", { name: "الجمهور (الافتراضي)", exact: true })).toHaveAttribute("aria-selected", "true");
});
