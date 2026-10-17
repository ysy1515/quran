import { beforeEach, describe, expect, it } from "vitest";
import { LAST_AYAH, juzStart, previousAyah } from "@workspace/quran-meta";
import {
  PLAN_PRESETS,
  completeCurrentPortion,
  createPlan,
  isWithin,
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
});
