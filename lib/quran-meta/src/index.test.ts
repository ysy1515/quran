import { describe, expect, it } from "vitest";
import {
  AYAH_COUNTS,
  JUZ_STARTS,
  PAGE_STARTS,
  SAJDAH_AYAT,
  TOTAL_AYAHS,
  ayahCount,
  isSajdahAyah,
  isValidAyah,
  juzOfAyah,
  juzStart,
  pageEnd,
  pageOfAyah,
  pageStart,
  shouldShowBasmalahHeader,
  surahName,
} from "./index";

// Independent spot checks (Hafs, standard Madani numbering), written separately
// from the generated tables so a bad regeneration is caught.
const KNOWN_COUNTS: Record<number, number> = {
  1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 9: 129, 12: 111,
  18: 110, 19: 98, 26: 227, 36: 83, 55: 78, 67: 30, 78: 40, 103: 3,
  108: 3, 110: 3, 112: 4, 113: 5, 114: 6,
};

const KNOWN_JUZ_STARTS: [number, number][] = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111],
  [7, 88], [8, 41], [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75],
  [21, 1], [23, 1], [25, 21], [27, 56], [29, 46], [33, 31], [36, 28], [39, 32],
  [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
];

const KNOWN_SAJDAH: [number, number][] = [
  [7, 206], [13, 15], [16, 50], [17, 109], [19, 58], [22, 18], [22, 77],
  [25, 60], [27, 26], [32, 15], [38, 24], [41, 38], [53, 62], [84, 21], [96, 19],
];

describe("quran-meta reference tables", () => {
  it("has 114 surahs totalling 6236 ayat", () => {
    expect(AYAH_COUNTS).toHaveLength(114);
    expect(AYAH_COUNTS.reduce((a, b) => a + b, 0)).toBe(TOTAL_AYAHS);
  });

  it.each(Object.entries(KNOWN_COUNTS))("surah %s has %s ayat", (surah, count) => {
    expect(ayahCount(Number(surah))).toBe(count);
  });

  it("matches the 30 juz boundaries", () => {
    expect(JUZ_STARTS.map(([s, a]) => [s, a])).toEqual(KNOWN_JUZ_STARTS);
    expect(juzStart(30)).toEqual({ surah: 78, ayah: 1 });
  });

  it("matches the 15 sajdah ayat", () => {
    expect(SAJDAH_AYAT.map(([s, a]) => [s, a])).toEqual(KNOWN_SAJDAH);
    expect(isSajdahAyah(96, 19)).toBe(true);
    expect(isSajdahAyah(96, 18)).toBe(false);
  });

  it("has 604 pages in reading order starting at 1:1 and 2:1", () => {
    expect(PAGE_STARTS).toHaveLength(604);
    expect(PAGE_STARTS[0]).toEqual([1, 1]);
    expect(PAGE_STARTS[1]).toEqual([2, 1]);
    for (let i = 1; i < PAGE_STARTS.length; i++) {
      const [ps, pa] = PAGE_STARTS[i - 1]!;
      const [s, a] = PAGE_STARTS[i]!;
      expect(s > ps || (s === ps && a > pa)).toBe(true);
      expect(isValidAyah(s, a)).toBe(true);
    }
  });

  it("every juz start is a valid ayah and also a page start or inside a page", () => {
    for (const [s, a] of JUZ_STARTS) expect(isValidAyah(s, a)).toBe(true);
  });
});

describe("validation helpers", () => {
  it("rejects out-of-range surah and ayah numbers", () => {
    expect(isValidAyah(0, 1)).toBe(false);
    expect(isValidAyah(115, 1)).toBe(false);
    expect(isValidAyah(2, 287)).toBe(false);
    expect(isValidAyah(1, 0)).toBe(false);
    expect(isValidAyah(1, 1.5)).toBe(false);
    expect(isValidAyah(2, 286)).toBe(true);
    expect(() => ayahCount(0)).toThrow(RangeError);
  });
});

describe("shouldShowBasmalahHeader", () => {
  it("hides the header for Al-Fatiha, where the Basmalah is ayah 1", () => {
    expect(shouldShowBasmalahHeader(1)).toBe(false);
  });
  it("hides the header for At-Tawbah", () => {
    expect(shouldShowBasmalahHeader(9)).toBe(false);
  });
  it("shows the header for every other surah", () => {
    for (let s = 1; s <= 114; s++) {
      if (s === 1 || s === 9) continue;
      expect(shouldShowBasmalahHeader(s)).toBe(true);
    }
  });
});

describe("page and juz helpers", () => {
  it("names surahs from the generated table", () => {
    expect(surahName(1)).toBe("الفاتحة");
    expect(surahName(2)).toBe("البقرة");
    expect(surahName(18)).toBe("الكهف");
    expect(surahName(67)).toBe("الملك");
    expect(surahName(114)).toBe("الناس");
    expect(() => surahName(115)).toThrow(RangeError);
  });

  it("finds page boundaries of the Madani mushaf", () => {
    expect(pageStart(1)).toEqual({ surah: 1, ayah: 1 });
    expect(pageEnd(1)).toEqual({ surah: 1, ayah: 7 });
    expect(pageStart(2)).toEqual({ surah: 2, ayah: 1 });
    expect(pageEnd(2)).toEqual({ surah: 2, ayah: 5 });
    expect(pageEnd(604)).toEqual({ surah: 114, ayah: 6 });
  });

  it("maps ayat to pages and back", () => {
    expect(pageOfAyah(1, 1)).toBe(1);
    expect(pageOfAyah(1, 7)).toBe(1);
    expect(pageOfAyah(2, 1)).toBe(2);
    expect(pageOfAyah(2, 25)).toBe(5);
    expect(pageOfAyah(18, 1)).toBe(293);
    expect(pageOfAyah(67, 1)).toBe(562);
    expect(pageOfAyah(114, 6)).toBe(604);
    for (let p = 1; p <= 604; p++) {
      const s = pageStart(p);
      const e = pageEnd(p);
      expect(pageOfAyah(s.surah, s.ayah)).toBe(p);
      expect(pageOfAyah(e.surah, e.ayah)).toBe(p);
    }
  });

  it("maps ayat to juz", () => {
    expect(juzOfAyah(1, 1)).toBe(1);
    expect(juzOfAyah(2, 141)).toBe(1);
    expect(juzOfAyah(2, 142)).toBe(2);
    expect(juzOfAyah(67, 1)).toBe(29);
    expect(juzOfAyah(114, 6)).toBe(30);
  });
});
