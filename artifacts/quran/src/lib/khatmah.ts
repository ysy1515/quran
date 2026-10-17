import {
  JUZ_COUNT,
  LAST_AYAH,
  PAGE_COUNT,
  RUB_COUNT,
  compareAyah,
  juzOfAyah,
  pageOfAyah,
  pageStart,
  pageEnd,
  previousAyah,
  rubStart,
  type AyahRef,
} from "@workspace/quran-meta";
import { createLocalStore, useLocalStore } from "./localStore";

// A khatmah is a plan to read the whole Quran in a fixed number of portions
// ("awrad"). A plan may also start from a later juz; finishing that is recorded
// as a completed reading plan, never as a full khatmah. Everything is stored on this device.
// Portions are computed from Mushaf numbering only; no Quran text is stored here.

export type PlanUnit = "rub" | "page";

export interface KhatmahPlan {
  id: string;
  startedAt: string;
  /** "rub": each portion is `size` hizb quarters. "page": the pages are split into `portions` equal runs. */
  unit: PlanUnit;
  /** rub: quarters per portion (1 = 240 portions, 4 = hizb, 8 = juz). page: unused (1). */
  size: number;
  /** page plans only: number of portions. */
  portions: number;
  /** Juz the plan starts from (1 = the whole Quran). */
  startJuz: number;
  /** ISO date of each completed portion, in order. Its length is the number completed. */
  completions: string[];
}

export interface CompletedKhatmah {
  startedAt: string;
  completedAt: string;
  portions: number;
  /** Juz the finished plan started from. Only 1 is a full khatmah; later juz are partial reading plans. */
  startJuz: number;
}

export interface KhatmahState {
  plan: KhatmahPlan | null;
  history: CompletedKhatmah[];
}

export interface Portion {
  index: number; // 0-based
  from: AyahRef;
  to: AyahRef;
  fromPage: number;
  toPage: number;
  juz: number;
}

const EMPTY: KhatmahState = { plan: null, history: [] };
const ISO_MAX = 40;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function isIso(v: unknown): v is string {
  return typeof v === "string" && v.length <= ISO_MAX && !Number.isNaN(Date.parse(v));
}
function int(v: unknown, min: number, max: number): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null;
}

const RUB_SIZES = [1, 2, 4, 8] as const;

export function parsePlan(raw: unknown): KhatmahPlan | null {
  if (!isObj(raw)) return null;
  const unit = raw.unit === "rub" || raw.unit === "page" ? raw.unit : null;
  const startJuz = int(raw.startJuz, 1, JUZ_COUNT);
  const size = int(raw.size, 1, 8);
  const portions = int(raw.portions, 1, PAGE_COUNT);
  if (!unit || startJuz == null || size == null || portions == null) return null;
  if (typeof raw.id !== "string" || raw.id.length > 64 || !isIso(raw.startedAt)) return null;
  if (unit === "rub" && !(RUB_SIZES as readonly number[]).includes(size)) return null;
  if (!Array.isArray(raw.completions) || !raw.completions.every(isIso)) return null;
  const plan: KhatmahPlan = {
    id: raw.id,
    startedAt: raw.startedAt,
    unit,
    size,
    portions,
    startJuz,
    completions: raw.completions as string[],
  };
  if (plan.unit === "page" && plan.portions > pagesFrom(startJuz)) return null;
  if (plan.completions.length > portionCount(plan)) return null;
  return plan;
}

export function parseKhatmahState(raw: unknown): KhatmahState | null {
  if (!isObj(raw)) return null;
  // An unreadable plan is dropped on its own so finished khatmas stay in history.
  const plan = raw.plan == null ? null : parsePlan(raw.plan);
  const history = Array.isArray(raw.history)
    ? raw.history.flatMap((h): CompletedKhatmah[] => {
        if (!isObj(h) || !isIso(h.startedAt) || !isIso(h.completedAt)) return [];
        const portions = int(h.portions, 1, PAGE_COUNT);
        if (portions == null) return [];
        // Entries written before startJuz was recorded only came from this unreleased branch's
        // whole-Quran default; keep them rather than drop a user's history.
        const startJuz = h.startJuz === undefined ? 1 : int(h.startJuz, 1, JUZ_COUNT);
        if (startJuz == null) return [];
        return [{ startedAt: h.startedAt, completedAt: h.completedAt, portions, startJuz }];
      })
    : [];
  return { plan, history };
}

export const khatmahStore = createLocalStore<KhatmahState>("quran.khatmah.v1", EMPTY, parseKhatmahState);

// ── Portion math ─────────────────────────────────────────────────────────────

function firstRubOfJuz(juz: number): number {
  return (juz - 1) * 8 + 1;
}
function firstPageOfJuz(juz: number): number {
  const s = rubStart(firstRubOfJuz(juz));
  return pageOfAyah(s.surah, s.ayah);
}
/** Pages from the start of `juz` to the end of the Mushaf. */
export function pagesFrom(juz: number): number {
  return PAGE_COUNT - firstPageOfJuz(juz) + 1;
}
function rubsFrom(juz: number): number {
  return RUB_COUNT - firstRubOfJuz(juz) + 1;
}

export function portionCount(plan: Pick<KhatmahPlan, "unit" | "size" | "portions" | "startJuz">): number {
  if (plan.unit === "rub") return Math.ceil(rubsFrom(plan.startJuz) / plan.size);
  return plan.portions;
}

export function portionAt(plan: KhatmahPlan, index: number): Portion {
  const n = portionCount(plan);
  if (!Number.isInteger(index) || index < 0 || index >= n) throw new RangeError(`Invalid portion ${index}`);
  let from: AyahRef;
  let to: AyahRef;
  if (plan.unit === "rub") {
    const first = firstRubOfJuz(plan.startJuz) + index * plan.size;
    from = rubStart(first);
    const next = first + plan.size;
    to = next <= RUB_COUNT ? previousAyah(rubStart(next))! : LAST_AYAH;
  } else {
    const startPage = firstPageOfJuz(plan.startJuz);
    const total = PAGE_COUNT - startPage + 1;
    const fromPage = startPage + Math.floor((index * total) / n);
    const toPage = startPage + Math.floor(((index + 1) * total) / n) - 1;
    // Start at the juz boundary itself for the first portion (it may sit mid-page).
    from = index === 0 ? rubStart(firstRubOfJuz(plan.startJuz)) : pageStart(fromPage);
    to = pageEnd(toPage);
  }
  return {
    index,
    from,
    to,
    fromPage: pageOfAyah(from.surah, from.ayah),
    toPage: pageOfAyah(to.surah, to.ayah),
    juz: juzOfAyah(from.surah, from.ayah),
  };
}

export function isWithin(p: Portion, ref: AyahRef): boolean {
  return compareAyah(ref, p.from) >= 0 && compareAyah(ref, p.to) <= 0;
}

// ── Presets ──────────────────────────────────────────────────────────────────

export interface PlanPreset {
  id: string;
  label: string;
  hint: string;
  unit: PlanUnit;
  size: number;
}

export const PLAN_PRESETS: PlanPreset[] = [
  { id: "rub", label: "ربع حزب في كل ورد", hint: "٢٤٠ وردًا", unit: "rub", size: 1 },
  { id: "half-hizb", label: "نصف حزب في كل ورد", hint: "١٢٠ وردًا", unit: "rub", size: 2 },
  { id: "hizb", label: "حزب في كل ورد", hint: "٦٠ وردًا", unit: "rub", size: 4 },
  { id: "juz", label: "جزء في كل ورد", hint: "٣٠ وردًا", unit: "rub", size: 8 },
];

export const MIN_CUSTOM_PORTIONS = 3;

// ── Actions ──────────────────────────────────────────────────────────────────

function newId(now: Date): string {
  return `k-${now.getTime().toString(36)}`;
}

export function createPlan(
  opts: { unit: PlanUnit; size?: number; portions?: number; startJuz?: number },
  now = new Date(),
): KhatmahPlan {
  const startJuz = opts.startJuz ?? 1;
  const plan: KhatmahPlan = {
    id: newId(now),
    startedAt: now.toISOString(),
    unit: opts.unit,
    size: opts.unit === "rub" ? (opts.size ?? 1) : 1,
    portions: opts.unit === "page" ? Math.min(opts.portions ?? 30, pagesFrom(startJuz)) : 1,
    startJuz,
    completions: [],
  };
  const parsed = parsePlan(plan);
  if (!parsed) throw new RangeError("Invalid khatmah plan options");
  return parsed;
}

/** Replace the current plan with a new one. Finished khatmahs stay in history. */
export function startKhatmah(plan: KhatmahPlan) {
  khatmahStore.update((s) => ({ ...s, plan }));
}

export function completeCurrentPortion(now = new Date()) {
  khatmahStore.update((s) => {
    if (!s.plan) return s;
    const total = portionCount(s.plan);
    if (s.plan.completions.length >= total) return s;
    const completions = [...s.plan.completions, now.toISOString()];
    const plan = { ...s.plan, completions };
    const history =
      completions.length === total
        ? [...s.history, { startedAt: plan.startedAt, completedAt: now.toISOString(), portions: total, startJuz: plan.startJuz }]
        : s.history;
    return { plan, history };
  });
}

/** Undo the most recent "finished" tap (also un-finishes a khatmah completed by it). */
export function undoLastPortion() {
  khatmahStore.update((s) => {
    if (!s.plan || s.plan.completions.length === 0) return s;
    const total = portionCount(s.plan);
    const wasFinished = s.plan.completions.length === total;
    const plan = { ...s.plan, completions: s.plan.completions.slice(0, -1) };
    const history =
      wasFinished && s.history.at(-1)?.startedAt === plan.startedAt ? s.history.slice(0, -1) : s.history;
    return { plan, history };
  });
}

export function endKhatmah() {
  khatmahStore.update((s) => ({ ...s, plan: null }));
}

// ── Full khatmah vs partial plan ─────────────────────────────────────────────

/** A plan counts as a full khatmah only when it covers the whole Mushaf from Juz 1. */
export function isFullKhatmah(p: { startJuz: number }): boolean {
  return p.startJuz === 1;
}

export interface KhatmahStats {
  /** Finished whole-Quran khatmas. */
  fullCount: number;
  /** Finished plans that started after Juz 1 (not counted as a khatmah). */
  partialCount: number;
  lastFull: CompletedKhatmah | null;
  lastPartial: CompletedKhatmah | null;
}

export function khatmahStats(history: CompletedKhatmah[]): KhatmahStats {
  const full = history.filter(isFullKhatmah);
  const partial = history.filter((h) => !isFullKhatmah(h));
  return {
    fullCount: full.length,
    partialCount: partial.length,
    lastFull: full.at(-1) ?? null,
    lastPartial: partial.at(-1) ?? null,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface KhatmahView {
  plan: KhatmahPlan | null;
  history: CompletedKhatmah[];
  total: number;
  completed: number;
  upcoming: number;
  finished: boolean;
  /** The current plan covers the whole Mushaf (starts at Juz 1). */
  fullPlan: boolean;
  current: Portion | null;
  progress: number; // 0..1
  stats: KhatmahStats;
}

export function summarize(state: KhatmahState): KhatmahView {
  const { plan, history } = state;
  const stats = khatmahStats(history);
  if (!plan)
    return { plan, history, total: 0, completed: 0, upcoming: 0, finished: false, fullPlan: false, current: null, progress: 0, stats };
  const total = portionCount(plan);
  const completed = plan.completions.length;
  const finished = completed >= total;
  return {
    plan,
    history,
    total,
    completed,
    upcoming: finished ? 0 : total - completed - 1,
    finished,
    fullPlan: isFullKhatmah(plan),
    current: finished ? null : portionAt(plan, completed),
    progress: total ? completed / total : 0,
    stats,
  };
}

export function useKhatmah(): KhatmahView {
  return summarize(useLocalStore(khatmahStore));
}
