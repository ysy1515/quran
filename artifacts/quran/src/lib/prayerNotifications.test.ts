import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { DEFAULT_ADHAN_PREFS, prayerTimesFor } from "./prayer";

const native = vi.hoisted(() => ({
  getPending: vi.fn(), checkPermissions: vi.fn(), cancel: vi.fn(), schedule: vi.fn(),
}));
vi.mock("./appConfig", () => ({ isCapacitorNative: () => true, getCapacitorPlatform: () => "ios" }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: native }));
import { syncPrayerNotifications } from "./prayerNotifications";
const coords = { lat: 18.3, lng: 42.7333 };
const prefs = { ...DEFAULT_ADHAN_PREFS, enabled: true };
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 4, 0));
  vi.resetAllMocks();
  native.getPending.mockResolvedValue({ notifications: [] });
  native.checkPermissions.mockResolvedValue({ display: "granted" });
  native.cancel.mockResolvedValue(undefined);
  native.schedule.mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

it("does not replay a prayer when the device resumes thirty minutes after a native call started", async () => {
  const fajr = prayerTimesFor(coords, new Date(), prefs)[0]!.time;
  vi.setSystemTime(new Date(fajr.getTime() - 1000));
  native.getPending.mockImplementationOnce(async () => {
    vi.setSystemTime(new Date(fajr.getTime() + 30 * 60_000));
    return { notifications: [] };
  });
  await syncPrayerNotifications(coords, prefs);
  const notifications = native.schedule.mock.calls[0]![0].notifications;
  expect(notifications.length).toBeGreaterThan(20);
  expect(notifications.every((n: { schedule: { at: Date } }) => n.schedule.at.getTime() > Date.now())).toBe(true);
  expect(notifications.some((n: { schedule: { at: Date } }) => n.schedule.at.getTime() === fajr.getTime())).toBe(false);
});

it("cleans up the retired test notification while preserving daily reminders", async () => {
  native.getPending.mockResolvedValue({ notifications: [{ id: 1991 }, { id: 2001 }] });
  await syncPrayerNotifications(coords, prefs);
  expect(native.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1991 }] });
});
