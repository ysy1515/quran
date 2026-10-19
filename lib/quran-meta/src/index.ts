import { AYAH_COUNTS, JUZ_STARTS, PAGE_STARTS, RUB_STARTS, SAJDAH_AYAT, SURAH_NAMES_AR } from "./hafs.generated";

export { AYAH_COUNTS, JUZ_STARTS, PAGE_STARTS, RUB_STARTS, SAJDAH_AYAT, SURAH_NAMES_AR };

export const SURAH_COUNT = 114;
export const TOTAL_AYAHS = 6236;
export const PAGE_COUNT = 604;
export const JUZ_COUNT = 30;
export const RUB_COUNT = 240;

export function isValidSurah(surah: number): boolean {
  return Number.isInteger(surah) && surah >= 1 && surah <= SURAH_COUNT;
}

export function ayahCount(surah: number): number {
  if (!isValidSurah(surah)) throw new RangeError(`Invalid surah number: ${surah}`);
  return AYAH_COUNTS[surah - 1]!;
}

export function isValidAyah(surah: number, ayah: number): boolean {
  return isValidSurah(surah) && Number.isInteger(ayah) && ayah >= 1 && ayah <= AYAH_COUNTS[surah - 1]!;
}

export function isValidPage(page: number): boolean {
  return Number.isInteger(page) && page >= 1 && page <= PAGE_COUNT;
}

/** First ayah of a juz as { surah, ayah }. */
export function juzStart(juz: number): { surah: number; ayah: number } {
  if (!Number.isInteger(juz) || juz < 1 || juz > JUZ_COUNT) {
    throw new RangeError(`Invalid juz number: ${juz}`);
  }
  const [surah, ayah] = JUZ_STARTS[juz - 1]!;
  return { surah, ayah };
}

export function isSajdahAyah(surah: number, ayah: number): boolean {
  return SAJDAH_AYAT.some(([s, a]) => s === surah && a === ayah);
}

/**
 * Whether a reader should print a standalone Basmalah above the surah text.
 * Al-Fatiha (1): the Basmalah is ayah 1 of the surah itself, so printing a header
 * would show it twice. At-Tawbah (9): no Basmalah.
 */
export function shouldShowBasmalahHeader(surah: number): boolean {
  return isValidSurah(surah) && surah !== 1 && surah !== 9;
}

export interface AyahRef {
  surah: number;
  ayah: number;
}

/** Arabic surah name without tashkeel, e.g. surahName(2) === "البقرة". */
export function surahName(surah: number): string {
  if (!isValidSurah(surah)) throw new RangeError(`Invalid surah number: ${surah}`);
  return SURAH_NAMES_AR[surah - 1]!;
}

function compare(a: AyahRef, b: readonly [number, number]): number {
  return a.surah !== b[0] ? a.surah - b[0] : a.ayah - b[1];
}

/** First ayah of a Madani mushaf page. */
export function pageStart(page: number): AyahRef {
  if (!isValidPage(page)) throw new RangeError(`Invalid page number: ${page}`);
  const [surah, ayah] = PAGE_STARTS[page - 1]!;
  return { surah, ayah };
}

/** Last ayah of a Madani mushaf page (the ayah before the next page starts). */
export function pageEnd(page: number): AyahRef {
  if (!isValidPage(page)) throw new RangeError(`Invalid page number: ${page}`);
  if (page === PAGE_COUNT) return { surah: SURAH_COUNT, ayah: AYAH_COUNTS[SURAH_COUNT - 1]! };
  const [surah, ayah] = PAGE_STARTS[page]!;
  if (ayah > 1) return { surah, ayah: ayah - 1 };
  return { surah: surah - 1, ayah: AYAH_COUNTS[surah - 2]! };
}

/** Mushaf page that contains an ayah. */
export function pageOfAyah(surah: number, ayah: number): number {
  if (!isValidAyah(surah, ayah)) throw new RangeError(`Invalid ayah: ${surah}:${ayah}`);
  const ref = { surah, ayah };
  let lo = 0;
  let hi = PAGE_STARTS.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (compare(ref, PAGE_STARTS[mid]!) >= 0) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/** Juz that contains an ayah. */
export function juzOfAyah(surah: number, ayah: number): number {
  if (!isValidAyah(surah, ayah)) throw new RangeError(`Invalid ayah: ${surah}:${ayah}`);
  const ref = { surah, ayah };
  let juz = 1;
  for (let i = 0; i < JUZ_STARTS.length; i++) if (compare(ref, JUZ_STARTS[i]!) >= 0) juz = i + 1;
  return juz;
}

/** First ayah of a hizb quarter (1–240). */
export function rubStart(rub: number): AyahRef {
  if (!Number.isInteger(rub) || rub < 1 || rub > RUB_COUNT) throw new RangeError(`Invalid rub number: ${rub}`);
  const [surah, ayah] = RUB_STARTS[rub - 1]!;
  return { surah, ayah };
}

/** The ayah just before another one, or null for 1:1. */
export function previousAyah(ref: AyahRef): AyahRef | null {
  if (ref.ayah > 1) return { surah: ref.surah, ayah: ref.ayah - 1 };
  if (ref.surah === 1) return null;
  return { surah: ref.surah - 1, ayah: AYAH_COUNTS[ref.surah - 2]! };
}

export const LAST_AYAH: AyahRef = { surah: SURAH_COUNT, ayah: 6 };

/** Negative, zero or positive, like a sort comparator. */
export function compareAyah(a: AyahRef, b: AyahRef): number {
  return a.surah !== b.surah ? a.surah - b.surah : a.ayah - b.ayah;
}
