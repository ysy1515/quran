import { beforeEach, describe, expect, it } from "vitest";
import {
  bookmarksStore,
  favoritesStore,
  parseBookmark,
  removeBookmark,
  toggleBookmark,
  toggleFavorite,
} from "./bookmarks";
import { DEFAULT_DHIKR, chooseDhikr, dhikrStore, parseDhikrState, resetDhikrCount, setDhikrTarget, tapDhikr } from "./dhikr";
import { DEFAULT_REMINDERS, parseReminders, setReminder } from "./reminders";
import { addReadingSeconds, readingTimeStore } from "./readingTime";

const kursi = { surahNumber: 2, verseNumber: 255, pageNumber: 42, surahName: "البقرة" };

describe("bookmarks and favourites", () => {
  beforeEach(() => {
    bookmarksStore.reset();
    favoritesStore.reset();
  });

  it("toggles a bookmark on and off, newest first", () => {
    expect(toggleBookmark(kursi)).toBe(true);
    expect(toggleBookmark({ ...kursi, verseNumber: 256 })).toBe(true);
    expect(bookmarksStore.get().map((b) => b.verseNumber)).toEqual([256, 255]);
    expect(toggleBookmark(kursi)).toBe(false);
    expect(bookmarksStore.get().map((b) => b.verseNumber)).toEqual([256]);
    removeBookmark(2, 256);
    expect(bookmarksStore.get()).toEqual([]);
  });

  it("refuses an ayah that does not exist", () => {
    expect(toggleBookmark({ ...kursi, verseNumber: 300 })).toBe(false);
    expect(bookmarksStore.get()).toEqual([]);
  });

  it("stores the favourite's text exactly as given", () => {
    const text = "placeholder text ٰۡ";
    toggleFavorite({ ...kursi, text });
    expect(favoritesStore.get()[0]?.text).toBe(text);
  });

  it("rejects malformed saved entries", () => {
    expect(parseBookmark({ ...kursi, createdAt: 5 })).toBeNull();
    expect(parseBookmark({ ...kursi, pageNumber: 605, createdAt: "2026-10-17" })).toBeNull();
    expect(parseBookmark({ ...kursi, createdAt: "2026-10-17" })).toMatchObject(kursi);
  });
});

describe("tasbeeh counter", () => {
  beforeEach(() => dhikrStore.reset());

  it("loads saves from the old counter, which had no count", () => {
    expect(parseDhikrState({ presetText: "اللَّهُ أَكْبَرُ", target: 34, sessions: 5 })).toEqual({
      presetText: "اللَّهُ أَكْبَرُ",
      target: 34,
      sessions: 5,
      count: 0,
    });
    expect(parseDhikrState({ target: -3 })).toEqual(DEFAULT_DHIKR);
  });

  it("counts, completes a round once at the target, and keeps counting after", () => {
    setDhikrTarget(3);
    expect([tapDhikr(), tapDhikr(), tapDhikr(), tapDhikr()]).toEqual([false, false, true, false]);
    expect(dhikrStore.get()).toMatchObject({ count: 4, sessions: 1 });
  });

  it("reset and choosing a dhikr clear the count but keep rounds", () => {
    setDhikrTarget(1);
    tapDhikr();
    resetDhikrCount();
    expect(dhikrStore.get()).toMatchObject({ count: 0, sessions: 1 });
    tapDhikr();
    chooseDhikr("أَسْتَغْفِرُ اللَّهَ", 100);
    expect(dhikrStore.get()).toMatchObject({ presetText: "أَسْتَغْفِرُ اللَّهَ", target: 100, count: 0, sessions: 2 });
  });
});

describe("reminders", () => {
  it("fills missing or malformed entries from the defaults", () => {
    expect(parseReminders({ morning: { on: true, time: "06:15" }, evening: { on: "yes", time: "25:00" } })).toEqual({
      ...DEFAULT_REMINDERS,
      morning: { on: true, time: "06:15" },
    });
  });

  it("is unsupported outside the native app", async () => {
    expect(await setReminder("morning", { on: true })).toBe("unsupported");
  });
});

describe("reading time", () => {
  beforeEach(() => readingTimeStore.reset());

  it("adds seconds and caps a single flush at five minutes", () => {
    addReadingSeconds(30, new Date("2026-10-17T00:00:00Z"));
    addReadingSeconds(10_000);
    addReadingSeconds(-5);
    expect(readingTimeStore.get()).toEqual({ seconds: 330, since: "2026-10-17T00:00:00.000Z" });
  });
});
