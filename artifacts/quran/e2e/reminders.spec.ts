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
    };
    Object.assign(window, {
      webkit: { messageHandlers: { bridge: {} } },
      Capacitor: {
        PluginHeaders: Object.entries(methods).map(([name, names]) => ({
          name, methods: names.map((name) => ({ name, rtype: "promise" })),
        })),
        nativePromise: async (plugin: string, method: string, options: Record<string, unknown> = {}) => {
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

test("native prayer permission, test alert and pending diagnostics respond", async ({ page }) => {
  await nativeBridge(page);
  await page.goto("/adhan/settings");
  await page.getByTestId("test-notification").click();
  await expect(page.getByText("سيصلك إشعار تجريبي بعد ٥ ثوانٍ، يمكنك قفل الشاشة")).toBeVisible();
  await page.getByTestId("load-diagnostics").click();
  await expect(page.getByTestId("diagnostics")).toBeVisible();
  const pending = await page.evaluate(() => JSON.parse(localStorage.getItem("native:pending") ?? "[]"));
  expect(pending).toHaveLength(1);
  expect(pending[0].extra.kind).toBe("test");
  expect(pending[0].sound).toBeTruthy();
  expect(new Date(pending[0].schedule.at).getTime()).toBeGreaterThan(Date.now() - 10000);
});
