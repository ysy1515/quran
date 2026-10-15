import { AYAH_COUNTS, JUZ_STARTS, PAGE_STARTS, SAJDAH_AYAT } from "./hafs.generated";

export { AYAH_COUNTS, JUZ_STARTS, PAGE_STARTS, SAJDAH_AYAT };

export const SURAH_COUNT = 114;
export const TOTAL_AYAHS = 6236;
export const PAGE_COUNT = 604;
export const JUZ_COUNT = 30;

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
