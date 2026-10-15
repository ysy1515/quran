import { describe, expect, it } from "vitest";
import { createLocalStore } from "./localStore";
import {
  clampFontSize,
  parseReadingProgress,
  parseReadingStop,
  parseSettings,
  readingStats,
} from "./userData";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

const stop = { surahNumber: 2, verseNumber: 255, pageNumber: 42, surahName: "البقرة", createdAt: "2026-10-15T00:00:00Z" };

describe("parseReadingStop", () => {
  it("accepts a valid stop", () => expect(parseReadingStop(stop)).toEqual(stop));
  it("rejects an ayah beyond the end of the surah", () =>
    expect(parseReadingStop({ ...stop, verseNumber: 287 })).toBeNull());
  it("rejects surah 0 and 115", () => {
    expect(parseReadingStop({ ...stop, surahNumber: 0 })).toBeNull();
    expect(parseReadingStop({ ...stop, surahNumber: 115 })).toBeNull();
  });
  it("rejects page 605", () => expect(parseReadingStop({ ...stop, pageNumber: 605 })).toBeNull());
  it("rejects junk", () => {
    expect(parseReadingStop("x")).toBeNull();
    expect(parseReadingStop(null)).toBeNull();
    expect(parseReadingStop({ ...stop, surahName: 5 })).toBeNull();
  });
});

describe("parseReadingProgress", () => {
  const p = { lastSurahNumber: 1, lastVerseNumber: 7, lastPageNumber: 1, lastSurahName: "الفاتحة", updatedAt: "x" };
  it("accepts valid progress", () => expect(parseReadingProgress(p)).toEqual(p));
  it("rejects 1:8", () => expect(parseReadingProgress({ ...p, lastVerseNumber: 8 })).toBeNull());
});

describe("settings", () => {
  it("clamps font size to 80-160", () => {
    expect(clampFontSize(10)).toBe(80);
    expect(clampFontSize(999)).toBe(160);
    expect(clampFontSize(Number.NaN)).toBe(100);
  });
  it("fills defaults for missing fields", () => {
    expect(parseSettings({})).toEqual({ fontSize: 100, showTafsir: true });
    expect(parseSettings({ fontSize: 130, showTafsir: false })).toEqual({ fontSize: 130, showTafsir: false });
  });
});

describe("readingStats", () => {
  it("matches the previous server formula", () => {
    expect(readingStats(null)).toEqual({ pagesRead: 0, completedJuz: 0 });
    const at = (page: number) =>
      readingStats({ lastSurahNumber: 2, lastVerseNumber: 1, lastPageNumber: page, lastSurahName: "", updatedAt: "" });
    expect(at(1)).toEqual({ pagesRead: 0, completedJuz: 0 });
    expect(at(22)).toEqual({ pagesRead: 21, completedJuz: 1 });
    expect(at(604)).toEqual({ pagesRead: 603, completedJuz: 29 });
  });
});

describe("createLocalStore", () => {
  it("persists, reloads and notifies", () => {
    const storage = memoryStorage();
    const a = createLocalStore("k", null as typeof stop | null, parseReadingStop, storage);
    let calls = 0;
    a.subscribe(() => calls++);
    a.set(stop);
    expect(calls).toBe(1);
    const b = createLocalStore("k", null as typeof stop | null, parseReadingStop, storage);
    expect(b.get()).toEqual(stop);
  });

  it("falls back on corrupt or invalid data", () => {
    const corrupt = createLocalStore("k", null, parseReadingStop, memoryStorage({ k: "{not json" }));
    expect(corrupt.get()).toBeNull();
    const invalid = createLocalStore(
      "k",
      null,
      parseReadingStop,
      memoryStorage({ k: JSON.stringify({ ...stop, verseNumber: 999 }) }),
    );
    expect(invalid.get()).toBeNull();
  });

  it("keeps working when storage throws", () => {
    const broken = {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("denied"); },
      removeItem: () => { throw new Error("denied"); },
    };
    const s = createLocalStore("k", 1, (v) => (typeof v === "number" ? v : null), broken);
    expect(s.get()).toBe(1);
    s.set(2);
    expect(s.get()).toBe(2);
  });
});
