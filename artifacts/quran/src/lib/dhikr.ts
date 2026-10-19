import { createLocalStore, useLocalStore } from "./localStore";

// The Tasbeeh counter's saved state. It uses the counter's original key
// ("dhikr-state") so the chosen dhikr, target and finished rounds saved by
// earlier versions carry over. `count` is new: older saves load with count 0.

export interface DhikrState {
  presetText: string;
  target: number;
  sessions: number;
  count: number;
}

export const DEFAULT_DHIKR: DhikrState = { presetText: "سُبْحَانَ اللَّهِ", target: 33, sessions: 0, count: 0 };

function nonNegInt(v: unknown, max: number): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max ? v : null;
}

export function parseDhikrState(raw: unknown): DhikrState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const presetText = typeof r.presetText === "string" && r.presetText.length <= 200 ? r.presetText : DEFAULT_DHIKR.presetText;
  const target = nonNegInt(r.target, 100000);
  return {
    presetText,
    target: target && target > 0 ? target : DEFAULT_DHIKR.target,
    sessions: nonNegInt(r.sessions, 10_000_000) ?? 0,
    count: nonNegInt(r.count, 10_000_000) ?? 0,
  };
}

export const dhikrStore = createLocalStore<DhikrState>("dhikr-state", DEFAULT_DHIKR, parseDhikrState);

export function useDhikrState(): DhikrState {
  return useLocalStore(dhikrStore);
}

/** Adds one tasbeeh. Returns true when this tap reached the target (a round finished). */
export function tapDhikr(): boolean {
  let reached = false;
  dhikrStore.update((s) => {
    const count = s.count + 1;
    reached = count === s.target;
    return { ...s, count, sessions: reached ? s.sessions + 1 : s.sessions };
  });
  return reached;
}

export function resetDhikrCount() {
  dhikrStore.update((s) => ({ ...s, count: 0 }));
}

export function chooseDhikr(presetText: string, target: number) {
  dhikrStore.update((s) => ({ ...s, presetText, target, count: 0 }));
}

export function setDhikrTarget(target: number) {
  dhikrStore.update((s) => ({ ...s, target, count: 0 }));
}
