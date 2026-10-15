import { describe, expect, it, vi } from "vitest";
import { IncompleteSurahError, fetchCompleteSurah } from "./quran";

type V = { verse_number: number; verse_key: string; text_uthmani: string };

function fakeQuranCom(surah: number, total: number, opts: { drop?: number } = {}) {
  const all: V[] = Array.from({ length: total }, (_, i) => ({
    verse_number: i + 1,
    verse_key: `${surah}:${i + 1}`,
    text_uthmani: `text-${surah}-${i + 1}ٰ۟`,
  })).filter((v) => v.verse_number !== opts.drop);
  return vi.fn(async (url: string) => {
    const u = new URL(url);
    const page = Number(u.searchParams.get("page"));
    const per = Number(u.searchParams.get("per_page"));
    const verses = all.slice((page - 1) * per, page * per);
    return new Response(JSON.stringify({ verses }), { status: 200 });
  });
}

describe("fetchCompleteSurah", () => {
  it("assembles all 286 ayat of Al-Baqarah from pages of 50", async () => {
    const fetchFn = fakeQuranCom(2, 286);
    const verses = await fetchCompleteSurah(2, fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(6);
    expect(verses).toHaveLength(286);
    expect(verses.at(-1)?.verse_key).toBe("2:286");
  });

  it("passes the Arabic text through byte-for-byte", async () => {
    const verses = await fetchCompleteSurah(1, fakeQuranCom(1, 7));
    expect(verses.map((v) => v.text_uthmani)).toEqual(
      Array.from({ length: 7 }, (_, i) => `text-1-${i + 1}ٰ۟`),
    );
  });

  it("refuses a surah with a missing ayah", async () => {
    await expect(fetchCompleteSurah(2, fakeQuranCom(2, 286, { drop: 120 }))).rejects.toBeInstanceOf(
      IncompleteSurahError,
    );
  });

  it("refuses a truncated surah (e.g. a source that caps results)", async () => {
    const capped = vi.fn(async () => new Response(JSON.stringify({ verses: [] }), { status: 200 }));
    await expect(fetchCompleteSurah(2, capped)).rejects.toBeInstanceOf(IncompleteSurahError);
  });

  it("surfaces upstream errors", async () => {
    const failing = vi.fn(async () => new Response("", { status: 503 }));
    await expect(fetchCompleteSurah(1, failing)).rejects.toThrow("503");
  });
});
