import { beforeEach, describe, expect, it, vi } from "vitest";
import { maybeRequestReview, openNativeReview, parseReviewState, recordReviewVisit, reviewEligible, reviewStore } from "./appReview";
import { readingTimeStore } from "./readingTime";
import { connectDurableStorage, disconnectDurableStorageForTests, durableWritesSettled } from "./localStore";

const bridge = vi.hoisted(() => ({ requestReview: vi.fn(), openStoreReview: vi.fn() }));
const platform = vi.hoisted(() => ({ value: "ios" }));
vi.mock("@capacitor/core", () => ({ registerPlugin: () => bridge }));
vi.mock("./appConfig", () => ({ getCapacitorPlatform: () => platform.value }));
const DAY = 86400000;
const NOW = new Date("2026-11-04T12:00:00Z").getTime();
const eligible = () => ({ firstSeen: NOW - 8 * DAY, activeDays: ["2026-10-27", "2026-10-30", "2026-11-04"], attempts: [], manualOpenedAt: null });

beforeEach(() => {
  vi.resetAllMocks();
  disconnectDurableStorageForTests();
  reviewStore.reset();
  readingTimeStore.reset();
  platform.value = "ios";
  bridge.requestReview.mockResolvedValue({ requested: true });
  bridge.openStoreReview.mockResolvedValue({ opened: true });
});

describe("review timing", () => {
  it("requires a week, three distinct usage days and ten minutes reading", () => {
    expect(reviewEligible(eligible(), 600, NOW)).toBe(true);
    expect(reviewEligible({ ...eligible(), firstSeen: NOW - 6 * DAY }, 600, NOW)).toBe(false);
    expect(reviewEligible({ ...eligible(), activeDays: ["2026-11-04"] }, 600, NOW)).toBe(false);
    expect(reviewEligible(eligible(), 599, NOW)).toBe(false);
  });
  it("counts each local day once", () => {
    recordReviewVisit(new Date(NOW));
    recordReviewVisit(new Date(NOW + 1000));
    expect(reviewStore.get().activeDays).toHaveLength(1);
  });
  it("spaces attempts by 120 days and caps them at three per year", () => {
    expect(reviewEligible({ ...eligible(), attempts: [NOW - 119 * DAY] }, 600, NOW)).toBe(false);
    expect(reviewEligible({ ...eligible(), attempts: [NOW - 121 * DAY] }, 600, NOW)).toBe(true);
    expect(reviewEligible({ ...eligible(), attempts: [NOW - 363 * DAY, NOW - 242 * DAY, NOW - 121 * DAY] }, 600, NOW)).toBe(false);
  });
  it("records an attempt once and suppresses repeated calls, without claiming a rating", async () => {
    reviewStore.set(eligible());
    readingTimeStore.set({ seconds: 600, since: new Date(NOW).toISOString() });
    expect(await maybeRequestReview(NOW)).toBe(true);
    expect(await maybeRequestReview(NOW)).toBe(false);
    expect(bridge.requestReview).toHaveBeenCalledTimes(1);
    expect(reviewStore.get()).not.toHaveProperty("rated");
  });
  it("does not request the iOS review on web or Android", async () => {
    reviewStore.set(eligible());
    readingTimeStore.set({ seconds: 600, since: new Date(NOW).toISOString() });
    for (const value of ["web", "android"]) {
      platform.value = value;
      expect(await maybeRequestReview(NOW)).toBe(false);
    }
    expect(bridge.requestReview).not.toHaveBeenCalled();
  });
  it("handles a missing native plugin without an unhandled failure or repeated prompts", async () => {
    reviewStore.set(eligible());
    readingTimeStore.set({ seconds: 600, since: new Date(NOW).toISOString() });
    bridge.requestReview.mockRejectedValue(new Error("unavailable"));
    expect(await maybeRequestReview(NOW)).toBe(false);
    expect(await maybeRequestReview(NOW + 1000)).toBe(false);
    expect(bridge.requestReview).toHaveBeenCalledTimes(1);
  });
  it("persists successful manual opening and avoids automatic reminders for a year", async () => {
    const values = new Map<string, string>();
    const backend = { get: async (key: string) => values.get(key) ?? null,
      set: async (key: string, value: string) => { values.set(key, value); } };
    await connectDurableStorage(backend, ["quran.review.v1"]);
    reviewStore.set(eligible());
    expect(await openNativeReview()).toBe(true);
    await durableWritesSettled();
    const opened = reviewStore.get().manualOpenedAt!;
    disconnectDurableStorageForTests();
    reviewStore.reset();
    await connectDurableStorage(backend, ["quran.review.v1"]);
    expect(reviewEligible(reviewStore.get(), 600, opened + 364 * DAY)).toBe(false);
    expect(reviewEligible(reviewStore.get(), 600, opened + 366 * DAY)).toBe(true);
  });
  it("does not record a failed store opening", async () => {
    bridge.openStoreReview.mockResolvedValue({ opened: false });
    expect(await openNativeReview()).toBe(false);
    expect(reviewStore.get().manualOpenedAt).toBeNull();
  });
  it("repairs malformed saved entries", () => {
    expect(parseReviewState(null)).toBeNull();
    expect(parseReviewState({ ...eligible(), attempts: [NaN, -1, NOW], activeDays: [null, "bad", "2026-11-04", "2026-11-04"] }))
      .toMatchObject({ attempts: [NOW], activeDays: ["2026-11-04"] });
  });
});
