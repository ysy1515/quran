import { PAGE_COUNT, JUZ_COUNT, isValidAyah, isValidPage } from "@workspace/quran-meta";
import { createLocalStore, useLocalStore } from "./localStore";

// Personal reading data lives on this device only. Nothing here is sent to the
// server. Account sync is a later phase.

export interface ReadingStop {
  surahNumber: number;
  verseNumber: number;
  pageNumber: number;
  surahName: string;
  createdAt: string;
}

export interface ReadingProgress {
  lastSurahNumber: number;
  lastVerseNumber: number;
  lastPageNumber: number;
  lastSurahName: string;
  updatedAt: string;
}

export interface ReaderSettings {
  fontSize: number;
  showTafsir: boolean;
}

export const FONT_SIZE_MIN = 80;
export const FONT_SIZE_MAX = 160;
export const DEFAULT_SETTINGS: ReaderSettings = { fontSize: 100, showTafsir: true };

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown, max = 100): string | null {
  return typeof v === "string" && v.length <= max ? v : null;
}

export function parseReadingStop(raw: unknown): ReadingStop | null {
  if (!isObj(raw)) return null;
  const { surahNumber, verseNumber, pageNumber } = raw as Record<string, number>;
  const surahName = str(raw.surahName);
  const createdAt = str(raw.createdAt, 40);
  if (!isValidAyah(surahNumber, verseNumber) || !isValidPage(pageNumber)) return null;
  if (surahName == null || createdAt == null) return null;
  return { surahNumber, verseNumber, pageNumber, surahName, createdAt };
}

export function parseReadingProgress(raw: unknown): ReadingProgress | null {
  if (!isObj(raw)) return null;
  const { lastSurahNumber, lastVerseNumber, lastPageNumber } = raw as Record<string, number>;
  const lastSurahName = str(raw.lastSurahName);
  const updatedAt = str(raw.updatedAt, 40);
  if (!isValidAyah(lastSurahNumber, lastVerseNumber) || !isValidPage(lastPageNumber)) return null;
  if (lastSurahName == null || updatedAt == null) return null;
  return { lastSurahNumber, lastVerseNumber, lastPageNumber, lastSurahName, updatedAt };
}

export function clampFontSize(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.fontSize;
  return Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, Math.round(n)));
}

export function parseSettings(raw: unknown): ReaderSettings | null {
  if (!isObj(raw)) return null;
  return {
    fontSize: typeof raw.fontSize === "number" ? clampFontSize(raw.fontSize) : DEFAULT_SETTINGS.fontSize,
    showTafsir: typeof raw.showTafsir === "boolean" ? raw.showTafsir : DEFAULT_SETTINGS.showTafsir,
  };
}

export const readingStopStore = createLocalStore<ReadingStop | null>("quran.readingStop.v1", null, parseReadingStop);
export const progressStore = createLocalStore<ReadingProgress | null>("quran.progress.v1", null, parseReadingProgress);
export const settingsStore = createLocalStore<ReaderSettings>("quran.settings.v1", DEFAULT_SETTINGS, parseSettings);

/** The single "last stop" bookmark. Setting a new one replaces the old one. */
export function useReadingStop() {
  const stop = useLocalStore(readingStopStore);
  return {
    stop,
    isStopAt: (surah: number, verse: number) => stop?.surahNumber === surah && stop?.verseNumber === verse,
    setStop: (s: Omit<ReadingStop, "createdAt">) => {
      const parsed = parseReadingStop({ ...s, createdAt: new Date().toISOString() });
      if (parsed) readingStopStore.set(parsed);
    },
    clearStop: () => readingStopStore.set(null),
  };
}

export function recordProgress(p: Omit<ReadingProgress, "updatedAt">): void {
  const parsed = parseReadingProgress({ ...p, updatedAt: new Date().toISOString() });
  if (parsed) progressStore.set(parsed);
}

export function useReadingProgress() {
  return useLocalStore(progressStore);
}

export function useReaderSettings() {
  const settings = useLocalStore(settingsStore);
  return {
    settings,
    setFontSize: (n: number) => settingsStore.update((s) => ({ ...s, fontSize: clampFontSize(n) })),
    setShowTafsir: (v: boolean) => settingsStore.update((s) => ({ ...s, showTafsir: v })),
  };
}

/** Same rule the server used: pages before the current one count as read. */
export function readingStats(progress: ReadingProgress | null) {
  const lastPage = progress?.lastPageNumber ?? 1;
  const pagesRead = lastPage > 1 ? lastPage - 1 : 0;
  const completedJuz = pagesRead > 0 ? Math.floor(pagesRead / (PAGE_COUNT / JUZ_COUNT)) : 0;
  return { pagesRead, completedJuz };
}
