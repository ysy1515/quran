import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { connectDurableStorage, disconnectDurableStorageForTests } from "./localStore";
import { DEFAULT_REMINDERS, remindersStore, setReminder, syncReminders } from "./reminders";

const native = vi.hoisted(() => ({ value: true }));
const ln = vi.hoisted(() => ({
  requestPermissions: vi.fn(), checkPermissions: vi.fn(), getPending: vi.fn(),
  schedule: vi.fn(), cancel: vi.fn(),
}));
vi.mock("./appConfig", () => ({ isCapacitorNative: () => native.value }));
vi.mock("@capacitor/local-notifications", () => ({ LocalNotifications: ln }));

beforeEach(() => {
  vi.resetAllMocks();
  disconnectDurableStorageForTests();
  remindersStore.reset();
  native.value = true;
  ln.requestPermissions.mockResolvedValue({ display: "granted" });
  ln.checkPermissions.mockResolvedValue({ display: "granted" });
  ln.getPending.mockResolvedValue({ notifications: [] });
  ln.schedule.mockResolvedValue(undefined);
  ln.cancel.mockResolvedValue(undefined);
});

afterEach(() => vi.useRealTimers());

describe("daily reminder activation", () => {
  it("schedules a repeating audible alert and restores its saved time after restart", async () => {
    const values = new Map<string, string>();
    const backend = {
      get: async (key: string) => values.get(key) ?? null,
      set: async (key: string, value: string) => { values.set(key, value); },
    };
    await connectDurableStorage(backend, ["quran.reminders.v1"]);
    expect(await setReminder("morning", { on: true, time: "06:15" })).toBe("ok");
    expect(ln.schedule).toHaveBeenLastCalledWith({ notifications: [expect.objectContaining({
      id: 2002, sound: "default", schedule: { on: { hour: 6, minute: 15 }, repeats: true, allowWhileIdle: true },
    })] });
    disconnectDurableStorageForTests();
    remindersStore.reset();
    await connectDurableStorage(backend, ["quran.reminders.v1"]);
    expect(remindersStore.get().morning).toEqual({ on: true, time: "06:15" });
    await syncReminders();
    expect(ln.schedule).toHaveBeenCalledTimes(2);
  });

  it("keeps settings off when permission is refused", async () => {
    ln.checkPermissions.mockResolvedValue({ display: "prompt" });
    ln.requestPermissions.mockResolvedValue({ display: "denied" });
    expect(await setReminder("wird", { on: true })).toBe("denied");
    expect(remindersStore.get()).toEqual(DEFAULT_REMINDERS);
    expect(ln.schedule).not.toHaveBeenCalled();
  });

  it("reports schedule failure and allows retry without saving false success", async () => {
    ln.schedule.mockRejectedValueOnce(new Error("schedule failed"));
    expect(await setReminder("mulk", { on: true })).toBe("error");
    expect(remindersStore.get().mulk.on).toBe(false);
    expect(await setReminder("mulk", { on: true })).toBe("ok");
    expect(remindersStore.get().mulk.on).toBe(true);
  });

  it("serializes concurrent edits and resume with the latest saved settings", async () => {
    await Promise.all([
      setReminder("wird", { on: true }),
      setReminder("wird", { time: "18:45" }),
      setReminder("morning", { on: true }),
      syncReminders(),
    ]);
    expect(ln.schedule.mock.calls.at(-1)?.[0].notifications).toEqual([
      expect.objectContaining({ id: 2001, schedule: expect.objectContaining({ on: { hour: 18, minute: 45 } }) }),
      expect.objectContaining({ id: 2002 }),
    ]);
  });

  it("disables and cancels only daily reminders, preserving prayer alerts", async () => {
    await setReminder("wird", { on: true });
    ln.getPending.mockResolvedValue({ notifications: [{ id: 2001 }, { id: 1001 }] });
    ln.requestPermissions.mockClear();
    expect(await setReminder("wird", { on: false })).toBe("ok");
    expect(ln.cancel).toHaveBeenCalledWith({ notifications: [{ id: 2001 }] });
    expect(ln.requestPermissions).not.toHaveBeenCalled();
    expect(remindersStore.get().wird.on).toBe(false);
  });

  it("rejects invalid times and unsupported platforms without changing preferences", async () => {
    expect(await setReminder("wird", { time: "25:00" })).toBe("error");
    native.value = false;
    expect(await setReminder("wird", { on: true })).toBe("unsupported");
    expect(remindersStore.get()).toEqual(DEFAULT_REMINDERS);
    expect(ln.schedule).not.toHaveBeenCalled();
  });

  it("can turn off one reminder after permission is revoked without changing the others", async () => {
    await setReminder("wird", { on: true });
    await setReminder("morning", { on: true });
    ln.checkPermissions.mockResolvedValue({ display: "denied" });
    expect(await setReminder("wird", { on: false })).toBe("ok");
    expect(remindersStore.get().wird.on).toBe(false);
    expect(remindersStore.get().morning.on).toBe(true);
    expect(ln.cancel).toHaveBeenLastCalledWith({ notifications: [{ id: 2001 }] });
  });

  it("keeps the previous setting if cancellation fails", async () => {
    await setReminder("wird", { on: true });
    ln.cancel.mockRejectedValueOnce(new Error("cancel failed"));
    expect(await setReminder("wird", { on: false })).toBe("error");
    expect(remindersStore.get().wird.on).toBe(true);
  });

  it("releases a stalled startup sync so later switches can work", async () => {
    vi.useFakeTimers();
    ln.getPending.mockImplementationOnce(() => new Promise(() => {}));
    const stalled = syncReminders();
    const edit = setReminder("wird", { on: true });
    await vi.advanceTimersByTimeAsync(8001);
    expect(await stalled).toBe("timeout");
    expect(await edit).toBe("ok");
    expect(remindersStore.get().wird.on).toBe(true);
  });

  it("does not report a missing native plugin as permission denied", async () => {
    ln.checkPermissions.mockRejectedValue({ code: "UNIMPLEMENTED" });
    expect(await setReminder("wird", { on: true })).toBe("unavailable");
    expect(remindersStore.get().wird.on).toBe(false);
  });

  it("does not save an enabled switch when scheduling never responds", async () => {
    vi.useFakeTimers();
    ln.schedule.mockImplementationOnce(() => new Promise(() => {}));
    const edit = setReminder("wird", { on: true });
    await vi.advanceTimersByTimeAsync(8001);
    expect(await edit).toBe("timeout");
    expect(remindersStore.get().wird.on).toBe(false);
  });
});
