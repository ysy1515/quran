import { beforeEach, describe, expect, it } from "vitest";
import { LAST_AYAH, juzStart, previousAyah } from "@workspace/quran-meta";
import {
  PLAN_PRESETS,
  completeCurrentPortion,
  createPlan,
  isFullKhatmah,
  isWithin,
  khatmahStats,
  khatmahStore,
  pagesFrom,
  parseKhatmahState,
  parsePlan,
  portionAt,
  portionCount,
  startKhatmah,
  summarize,
  undoLastPortion,
  type KhatmahPlan,
} from "./khatmah";

const NOW = new Date("2026-10-17T08:00:00Z");

/** Every ayah from the start juz to the end belongs to exactly one portion, in order. */
function expectContiguous(plan: KhatmahPlan) {
  const n = portionCount(plan);
  expect(portionAt(plan, 0).from).toEqual(juzStart(plan.startJuz));
  for (let i = 1; i < n; i++) {
    expect(portionAt(plan, i - 1).to).toEqual(previousAyah(portionAt(plan, i).from));
  }
  expect(portionAt(plan, n - 1).to).toEqual(LAST_AYAH);
}

describe("khatmah portions", () => {
  it("has the reference preset counts for the whole Quran", () => {
    const counts = PLAN_PRESETS.map((p) => portionCount({ unit: p.unit, size: p.size, portions: 1, startJuz: 1 }));
    expect(counts).toEqual([240, 120, 60, 30]);
  });

  it("starts the first rub at Al-Fatihah 1 and the second at Al-Baqarah 26", () => {
    const plan = createPlan({ unit: "rub", size: 1 }, NOW);
    expect(portionAt(plan, 0)).toMatchObject({ from: { surah: 1, ayah: 1 }, to: { surah: 2, ayah: 25 }, fromPage: 1, juz: 1 });
    expect(portionAt(plan, 1).from).toEqual({ surah: 2, ayah: 26 });
  });

  it("covers the Quran with no gaps or overlaps for every preset", () => {
    for (const p of PLAN_PRESETS) expectContiguous(createPlan({ unit: p.unit, size: p.size }, NOW));
  });

  it("covers the Quran for custom page splits and later start juz", () => {
    for (const portions of [3, 7, 30, 100, 365, 604]) {
      expectContiguous(createPlan({ unit: "page", portions }, NOW));
    }
    expectContiguous(createPlan({ unit: "page", portions: 20, startJuz: 16 }, NOW));
    expectContiguous(createPlan({ unit: "rub", size: 4, startJuz: 30 }, NOW));
  });

  it("caps a custom split at one page per portion", () => {
    expect(createPlan({ unit: "page", portions: 10_000, startJuz: 30 }, NOW).portions).toBe(pagesFrom(30));
  });

  it("rejects an out-of-range portion index", () => {
    const plan = createPlan({ unit: "rub", size: 8 }, NOW);
    expect(() => portionAt(plan, 30)).toThrow(RangeError);
    expect(() => portionAt(plan, -1)).toThrow(RangeError);
  });

  it("knows whether an ayah is inside a portion", () => {
    const p = portionAt(createPlan({ unit: "rub", size: 1 }, NOW), 0);
    expect(isWithin(p, { surah: 2, ayah: 25 })).toBe(true);
    expect(isWithin(p, { surah: 2, ayah: 26 })).toBe(false);
  });
});

describe("khatmah progress", () => {
  beforeEach(() => khatmahStore.reset());

  it("records portions, finishes into history, and can undo", () => {
    startKhatmah(createPlan({ unit: "page", portions: 3 }, NOW));
    completeCurrentPortion(NOW);
    let v = summarize(khatmahStore.get());
    expect(v).toMatchObject({ total: 3, completed: 1, upcoming: 1, finished: false });
    expect(v.current?.index).toBe(1);

    completeCurrentPortion(NOW);
    completeCurrentPortion(NOW);
    completeCurrentPortion(NOW); // ignored once finished
    v = summarize(khatmahStore.get());
    expect(v).toMatchObject({ completed: 3, finished: true, current: null, progress: 1 });
    expect(v.history).toHaveLength(1);

    undoLastPortion();
    v = summarize(khatmahStore.get());
    expect(v).toMatchObject({ completed: 2, finished: false });
    expect(v.history).toHaveLength(0);
  });

  it("keeps completed khatmas when a new plan starts", () => {
    startKhatmah(createPlan({ unit: "page", portions: 3 }, NOW));
    for (let i = 0; i < 3; i++) completeCurrentPortion(NOW);
    startKhatmah(createPlan({ unit: "rub", size: 8 }, NOW));
    const v = summarize(khatmahStore.get());
    expect(v.history).toHaveLength(1);
    expect(v.completed).toBe(0);
  });
});

describe("partial plans are not full khatmas", () => {
  beforeEach(() => khatmahStore.reset());

  const finish = () => {
    const total = summarize(khatmahStore.get()).total;
    for (let i = 0; i < total; i++) completeCurrentPortion(NOW);
  };

  it.each(Array.from({ length: 29 }, (_, i) => i + 2))("a plan from juz %i is recorded as a partial plan", (startJuz) => {
    startKhatmah(createPlan({ unit: "rub", size: 8, startJuz }, NOW));
    const before = summarize(khatmahStore.get());
    expect(before.fullPlan).toBe(false);
    expect(before.total).toBe(31 - startJuz);
    finish();
    const v = summarize(khatmahStore.get());
    expect(v.finished).toBe(true);
    expect(v.history.at(-1)).toMatchObject({ startJuz, portions: 31 - startJuz });
    expect(v.stats).toMatchObject({ fullCount: 0, partialCount: 1, lastFull: null });
    expect(isFullKhatmah(v.history[0]!)).toBe(false);
  });

  it("covers juz 2–30 contiguously for every preset and a custom split", () => {
    for (let startJuz = 2; startJuz <= 30; startJuz++) {
      for (const p of PLAN_PRESETS) expectContiguous(createPlan({ unit: p.unit, size: p.size, startJuz }, NOW));
      expectContiguous(createPlan({ unit: "page", portions: Math.min(7, pagesFrom(startJuz)), startJuz }, NOW));
    }
  });

  it("counts only juz-1 plans as full khatmas, in order", () => {
    startKhatmah(createPlan({ unit: "rub", size: 8 }, NOW));
    finish();
    startKhatmah(createPlan({ unit: "rub", size: 8, startJuz: 15 }, NOW));
    finish();
    startKhatmah(createPlan({ unit: "page", portions: 3, startJuz: 30 }, NOW));
    finish();
    const { stats, history } = summarize(khatmahStore.get());
    expect(history.map((h) => h.startJuz)).toEqual([1, 15, 30]);
    expect(stats).toMatchObject({ fullCount: 1, partialCount: 2 });
    expect(stats.lastFull?.startJuz).toBe(1);
    expect(stats.lastPartial?.startJuz).toBe(30);
  });

  it("marks a juz-1 plan as full and counts it once finished", () => {
    startKhatmah(createPlan({ unit: "page", portions: 3 }, NOW));
    expect(summarize(khatmahStore.get()).fullPlan).toBe(true);
    finish();
    expect(summarize(khatmahStore.get()).stats).toMatchObject({ fullCount: 1, partialCount: 0 });
  });

  it("undo of the last portion of a partial plan removes it from history", () => {
    startKhatmah(createPlan({ unit: "rub", size: 8, startJuz: 29 }, NOW));
    finish();
    expect(summarize(khatmahStore.get()).stats.partialCount).toBe(1);
    undoLastPortion();
    expect(summarize(khatmahStore.get()).stats).toMatchObject({ fullCount: 0, partialCount: 0 });
  });

  it("khatmahStats separates kinds", () => {
    const at = NOW.toISOString();
    expect(
      khatmahStats([
        { startedAt: at, completedAt: at, portions: 30, startJuz: 1 },
        { startedAt: at, completedAt: at, portions: 2, startJuz: 29 },
      ]),
    ).toMatchObject({ fullCount: 1, partialCount: 1 });
  });
});

describe("khatmah parsing", () => {
  const plan = createPlan({ unit: "rub", size: 4 }, NOW);

  it("round-trips a saved plan", () => {
    expect(parsePlan(JSON.parse(JSON.stringify(plan)))).toEqual(plan);
  });

  it("rejects corrupt or impossible plans", () => {
    expect(parsePlan({ ...plan, size: 3 })).toBeNull();
    expect(parsePlan({ ...plan, unit: "day" })).toBeNull();
    expect(parsePlan({ ...plan, startJuz: 31 })).toBeNull();
    expect(parsePlan({ ...plan, completions: Array(61).fill(NOW.toISOString()) })).toBeNull();
    expect(parsePlan({ ...plan, completions: ["yesterday"] })).toBeNull();
  });

  it("keeps history when the current plan is unreadable", () => {
    const state = parseKhatmahState({
      plan: { broken: true },
      history: [{ startedAt: NOW.toISOString(), completedAt: NOW.toISOString(), portions: 30 }],
    });
    expect(state?.plan).toBeNull();
    expect(state?.history).toHaveLength(1);
  });

  it("keeps the start juz of history entries and rejects an invalid one", () => {
    const at = NOW.toISOString();
    const state = parseKhatmahState({
      plan: null,
      history: [
        { startedAt: at, completedAt: at, portions: 30 }, // older entry without startJuz
        { startedAt: at, completedAt: at, portions: 2, startJuz: 29 },
        { startedAt: at, completedAt: at, portions: 2, startJuz: 40 },
      ],
    });
    expect(state?.history.map((h) => h.startJuz)).toEqual([1, 29]);
  });
});
