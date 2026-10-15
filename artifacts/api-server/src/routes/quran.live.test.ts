import { describe, expect, it } from "vitest";
import { ayahCount } from "@workspace/quran-meta";
import { fetchCompleteSurah } from "./quran";

// Calls the real Quran.com API, so it only runs through `pnpm verify:quran`
// (QURAN_LIVE=1). It checks that every surah comes back complete and in order;
// it never compares or alters the Arabic text itself.
const live = process.env.QURAN_LIVE === "1";

describe.skipIf(!live)("live Quran.com retrieval", () => {
  it("returns Al-Baqarah 2:1 to 2:286 in order", async () => {
    const verses = await fetchCompleteSurah(2);
    expect(verses).toHaveLength(286);
    expect(verses[0].verse_key).toBe("2:1");
    expect(verses[285].verse_key).toBe("2:286");
    expect(verses.every((v) => v.text_uthmani.length > 0)).toBe(true);
  }, 60_000);

  it("returns every surah complete (6236 ayat)", async () => {
    let total = 0;
    const failures: string[] = [];
    for (let s = 1; s <= 114; s++) {
      try {
        const verses = await fetchCompleteSurah(s);
        total += verses.length;
      } catch (err) {
        failures.push(`${s}: ${(err as Error).message}`);
      }
    }
    expect(failures).toEqual([]);
    expect(total).toBe(6236);
    expect(Array.from({ length: 114 }, (_, i) => ayahCount(i + 1)).reduce((a, b) => a + b)).toBe(6236);
  }, 600_000);
});
