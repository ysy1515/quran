import { isValidAyah, isValidPage } from "@workspace/quran-meta";
import { createLocalStore, useLocalStore, type LocalStore } from "./localStore";

// Multiple bookmarks ("الفواصل") and favourite ayat, on this device only.
// The original single reading stop (quran.readingStop.v1) is untouched and still
// works as before; these lists sit beside it.

export interface AyahBookmark {
  surahNumber: number;
  verseNumber: number;
  pageNumber: number;
  surahName: string;
  createdAt: string;
}

export interface FavoriteAyah extends AyahBookmark {
  /** Ayah text exactly as received from the Quran source, kept for offline display. */
  text: string;
}

const MAX_ITEMS = 500;
const MAX_TEXT = 6000;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function parseBookmark(raw: unknown): AyahBookmark | null {
  if (!isObj(raw)) return null;
  const { surahNumber, verseNumber, pageNumber, surahName, createdAt } = raw as Record<string, unknown>;
  if (typeof surahNumber !== "number" || typeof verseNumber !== "number" || typeof pageNumber !== "number") return null;
  if (!isValidAyah(surahNumber, verseNumber) || !isValidPage(pageNumber)) return null;
  if (typeof surahName !== "string" || surahName.length > 100) return null;
  if (typeof createdAt !== "string" || createdAt.length > 40) return null;
  return { surahNumber, verseNumber, pageNumber, surahName, createdAt };
}

export function parseFavorite(raw: unknown): FavoriteAyah | null {
  const base = parseBookmark(raw);
  if (!base || !isObj(raw) || typeof raw.text !== "string" || raw.text.length > MAX_TEXT) return null;
  return { ...base, text: raw.text };
}

function listParser<T extends AyahBookmark>(item: (raw: unknown) => T | null) {
  return (raw: unknown): T[] | null => {
    if (!Array.isArray(raw)) return null;
    const out: T[] = [];
    const seen = new Set<string>();
    for (const r of raw.slice(0, MAX_ITEMS)) {
      const parsed = item(r);
      if (!parsed) continue;
      const key = `${parsed.surahNumber}:${parsed.verseNumber}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(parsed);
    }
    return out;
  };
}

export const bookmarksStore = createLocalStore<AyahBookmark[]>("quran.bookmarks.v1", [], listParser(parseBookmark));
export const favoritesStore = createLocalStore<FavoriteAyah[]>("quran.favorites.v1", [], listParser(parseFavorite));

const same = (a: { surahNumber: number; verseNumber: number }, s: number, v: number) =>
  a.surahNumber === s && a.verseNumber === v;

function toggleIn<T extends AyahBookmark>(store: LocalStore<T[]>, item: T, parse: (raw: unknown) => T | null): boolean {
  const list = store.get();
  if (list.some((b) => same(b, item.surahNumber, item.verseNumber))) {
    store.set(list.filter((b) => !same(b, item.surahNumber, item.verseNumber)));
    return false;
  }
  const parsed = parse(item);
  if (!parsed) return false;
  store.set([parsed, ...list].slice(0, MAX_ITEMS));
  return true;
}

/** Adds or removes a bookmark. Returns true if it is now bookmarked. */
export function toggleBookmark(b: Omit<AyahBookmark, "createdAt">): boolean {
  return toggleIn(bookmarksStore, { ...b, createdAt: new Date().toISOString() }, parseBookmark);
}

/** Adds or removes a favourite. Returns true if it is now a favourite. */
export function toggleFavorite(f: Omit<FavoriteAyah, "createdAt">): boolean {
  return toggleIn(favoritesStore, { ...f, createdAt: new Date().toISOString() }, parseFavorite);
}

export function removeBookmark(surah: number, verse: number) {
  bookmarksStore.set(bookmarksStore.get().filter((b) => !same(b, surah, verse)));
}

export function removeFavorite(surah: number, verse: number) {
  favoritesStore.set(favoritesStore.get().filter((b) => !same(b, surah, verse)));
}

export function useBookmarks() {
  const list = useLocalStore(bookmarksStore);
  return { list, has: (s: number, v: number) => list.some((b) => same(b, s, v)) };
}

export function useFavorites() {
  const list = useLocalStore(favoritesStore);
  return { list, has: (s: number, v: number) => list.some((b) => same(b, s, v)) };
}
