import { describe, expect, it } from "vitest";
import { FULL_ADHAN_TAP_WINDOW_MS, shouldPlayFullAdhanOnTap } from "./notificationTap";

const at = Date.UTC(2026, 9, 31, 12, 10);
const extra = { kind: "adhan", at: String(at), route: "/adhan" };

describe("tapping a prayer notification", () => {
  it("plays the full adhan on iOS shortly after the prayer time", () => {
    expect(shouldPlayFullAdhanOnTap(extra, "ios", "adhan", at + 20_000)).toBe(true);
  });

  it("never on Android, where the notification already plays the full adhan (no double playback)", () => {
    expect(shouldPlayFullAdhanOnTap(extra, "android", "adhan", at + 20_000)).toBe(false);
  });

  it("not for the device sound, early reminders, old notifications or bad data", () => {
    expect(shouldPlayFullAdhanOnTap(extra, "ios", "device", at)).toBe(false);
    expect(shouldPlayFullAdhanOnTap({ ...extra, kind: "pre" }, "ios", "adhan", at)).toBe(false);
    expect(shouldPlayFullAdhanOnTap(extra, "ios", "adhan", at + FULL_ADHAN_TAP_WINDOW_MS + 1)).toBe(false);
    expect(shouldPlayFullAdhanOnTap({ kind: "adhan" }, "ios", "adhan", at)).toBe(false);
    expect(shouldPlayFullAdhanOnTap(null, "ios", "adhan", at)).toBe(false);
  });
});
