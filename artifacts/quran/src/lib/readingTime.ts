import { createLocalStore, useLocalStore } from "./localStore";

// Time the Mushaf screen was open and visible, counted from when this version
// was installed. Shown as "الوقت المستغرق في المصحف" on the More screen.

export interface ReadingTime {
  seconds: number;
  since: string;
}

export function parseReadingTime(raw: unknown): ReadingTime | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.seconds !== "number" || !Number.isFinite(r.seconds) || r.seconds < 0) return null;
  if (typeof r.since !== "string" || r.since.length > 40) return null;
  return { seconds: Math.floor(r.seconds), since: r.since };
}

export const readingTimeStore = createLocalStore<ReadingTime | null>("quran.readingTime.v1", null, parseReadingTime);

export function addReadingSeconds(seconds: number, now = new Date()) {
  if (!(seconds > 0)) return;
  // A single flush never counts more than 5 minutes, so a suspended timer can't inflate it.
  const s = Math.min(Math.floor(seconds), 300);
  readingTimeStore.update((prev) => ({
    seconds: (prev?.seconds ?? 0) + s,
    since: prev?.since ?? now.toISOString(),
  }));
}

export function useReadingTime() {
  return useLocalStore(readingTimeStore);
}
