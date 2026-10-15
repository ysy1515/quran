import { describe, expect, it, vi } from "vitest";
import type { PushSubscription } from "@workspace/db";

const sendNotification = vi.fn();
vi.mock("web-push", () => ({ default: { sendNotification, setVapidDetails: vi.fn() } }));
vi.mock("./pushStore", () => ({
  deleteSubscription: vi.fn(async () => {}),
  listSubscriptions: vi.fn(async () => []),
  upsertSubscription: vi.fn(),
  updateSubscription: vi.fn(),
}));

const store = await import("./pushStore");
const { sendPush } = await import("../routes/push");
const { dueReminders, ksaClock } = await import("./scheduler");

function sub(endpoint: string, extra: Partial<PushSubscription> = {}): PushSubscription {
  return {
    id: 1,
    endpoint,
    p256dh: "p",
    auth: "a",
    sessionId: "default",
    notifyQuran: true,
    notifyDhikr: true,
    notifQuran1: "12:00",
    notifQuran2: "18:00",
    notifDhikr: "21:00",
    createdAt: new Date(),
    ...extra,
  };
}

describe("sendPush", () => {
  it("removes only gone subscriptions and never sends extra pushes", async () => {
    sendNotification
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ statusCode: 410 })
      .mockRejectedValueOnce({ statusCode: 500 });
    const result = await sendPush([sub("https://a"), sub("https://b"), sub("https://c")], {
      title: "t",
      body: "b",
    });
    expect(sendNotification).toHaveBeenCalledTimes(3);
    expect(store.deleteSubscription).toHaveBeenCalledTimes(1);
    expect(store.deleteSubscription).toHaveBeenCalledWith("https://b");
    expect(result).toEqual({ sent: 1, failed: 2, removed: 1 });
  });
});

describe("scheduler timing", () => {
  it("converts UTC to Saudi clock time", () => {
    expect(ksaClock(new Date("2026-01-01T09:00:00Z"))).toBe("12:00");
    expect(ksaClock(new Date("2026-01-01T22:05:00Z"))).toBe("01:05");
  });

  it("uses each subscriber's own times and opt-outs", () => {
    const now = new Date("2026-01-01T02:30:00Z"); // 05:30 in KSA
    const early = sub("https://early", { notifQuran1: "05:30" });
    const optedOut = sub("https://out", { notifQuran1: "05:30", notifyQuran: false });
    const other = sub("https://other");
    const due = dueReminders([early, optedOut, other], now);
    expect(due).toHaveLength(1);
    expect(due[0]!.reminder.key).toBe("quran1");
    expect(due[0]!.subs.map((s) => s.endpoint)).toEqual(["https://early"]);
  });
});
