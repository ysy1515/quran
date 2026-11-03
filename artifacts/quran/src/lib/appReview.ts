import { registerPlugin } from "@capacitor/core";
import { getCapacitorPlatform } from "./appConfig";
import { createLocalStore } from "./localStore";
import { readingTimeStore } from "./readingTime";

interface ReviewState {
  firstSeen: number;
  activeDays: string[];
  attempts: number[];
  manualOpenedAt: number | null;
}
const EMPTY: ReviewState = { firstSeen: 0, activeDays: [], attempts: [], manualOpenedAt: null };
const DAY = 86400000;
const validTime = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

export function parseReviewState(raw: unknown): ReviewState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!validTime(r.firstSeen) || !Array.isArray(r.activeDays) || !Array.isArray(r.attempts)) return null;
  return {
    firstSeen: r.firstSeen,
    activeDays: [...new Set(r.activeDays.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)))].slice(-30),
    attempts: r.attempts.filter(validTime).slice(-3),
    manualOpenedAt: validTime(r.manualOpenedAt) ? r.manualOpenedAt : null,
  };
}

export const reviewStore = createLocalStore<ReviewState>("quran.review.v1", EMPTY, parseReviewState);
const AppReview = registerPlugin<{
  requestReview(): Promise<{ requested: boolean }>;
  openStoreReview(): Promise<{ opened: boolean }>;
}>("AppReview");

export function recordReviewVisit(now = new Date()) {
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  reviewStore.update((s) => ({
    ...s, firstSeen: s.firstSeen || now.getTime(),
    activeDays: [...new Set([...s.activeDays, day])].slice(-30),
  }));
}

export function reviewEligible(s: ReviewState, readingSeconds: number, now = Date.now()): boolean {
  return s.firstSeen > 0 && now - s.firstSeen >= 7 * DAY && s.activeDays.length >= 3 && readingSeconds >= 600
    && (s.manualOpenedAt === null || now - s.manualOpenedAt >= 365 * DAY)
    && s.attempts.filter((t) => now - t < 365 * DAY).length < 3
    && s.attempts.every((t) => now - t >= 120 * DAY);
}

let requesting = false;
export async function maybeRequestReview(now = Date.now()): Promise<boolean> {
  if (getCapacitorPlatform() !== "ios" || requesting || !reviewEligible(reviewStore.get(), readingTimeStore.get()?.seconds ?? 0, now)) return false;
  requesting = true;
  // Record the attempt, not a rating: Apple doesn't report display or submission.
  reviewStore.update((s) => ({ ...s, attempts: [...s.attempts, now].slice(-3) }));
  try {
    return (await AppReview.requestReview()).requested;
  } catch {
    return false; // Never interrupt reading with an automatic-review error.
  } finally {
    requesting = false;
  }
}

export async function openNativeReview(): Promise<boolean> {
  const result = await AppReview.openStoreReview();
  if (result.opened) reviewStore.update((s) => ({ ...s, manualOpenedAt: Date.now() }));
  return result.opened;
}
