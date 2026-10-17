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

/**
 * Counts only the time the reader is visible. Each visible stretch is added when it
 * ends: on the periodic tick, when the app goes to the background (the page is
 * already hidden by then, so the stretch is closed from its recorded start, not by
 * checking visibility), and on unmount. Hidden time is never counted.
 */
export function createReadingTracker(opts: {
  now?: () => number;
  add?: (seconds: number) => void;
  visible: boolean;
}) {
  const now = opts.now ?? Date.now;
  const add = opts.add ?? ((s: number) => addReadingSeconds(s));
  let visibleSince: number | null = opts.visible ? now() : null;
  let stopped = false;

  const flush = () => {
    if (visibleSince == null) return;
    const t = now();
    add((t - visibleSince) / 1000);
    visibleSince = t;
  };

  return {
    /** Periodic save while visible. */
    tick: flush,
    /** The app or page was hidden: record the stretch that just ended and stop counting. */
    hide() {
      flush();
      visibleSince = null;
    },
    /** Visible again: start a new stretch (background time is not counted). */
    show() {
      if (!stopped && visibleSince == null) visibleSince = now();
    },
    /** The reader closed: record the final stretch. */
    stop() {
      this.hide();
      stopped = true;
    },
  };
}

export function useReadingTime() {
  return useLocalStore(readingTimeStore);
}
