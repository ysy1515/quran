import type { Page } from "@playwright/test";
import { SURAH_COUNT, ayahCount, juzOfAyah, pageOfAyah, pageStart, pageEnd, surahName } from "@workspace/quran-meta";

// A stand-in for the app's /api routes. Verse text is an obvious placeholder by
// default; it is never real Quran text.

const MEDINAN = new Set([2, 3, 4, 5, 8, 9, 13, 22, 24, 33, 47, 48, 49, 55, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 76, 98, 99, 110]);

export type VerseText = (surah: number, ayah: number) => string;
export const placeholderText: VerseText = (s, a) => `[نص تجريبي للآية ${s}:${a}]`;

function surah(n: number) {
  return {
    id: n,
    number: n,
    name: surahName(n),
    nameSimple: `Surah ${n}`,
    nameTranslation: `Surah ${n}`,
    revelationType: MEDINAN.has(n) ? "Medinan" : "Meccan",
    versesCount: ayahCount(n),
    pageNumber: pageOfAyah(n, 1),
    juzNumber: juzOfAyah(n, 1),
  };
}

function verse(s: number, a: number, text: VerseText) {
  return {
    id: `${s}:${a}`,
    verseKey: `${s}:${a}`,
    verseNumber: a,
    text: text(s, a),
    translationText: `Placeholder translation ${s}:${a}`,
    pageNumber: pageOfAyah(s, a),
    juzNumber: juzOfAyah(s, a),
    hizbNumber: 1,
  };
}

export async function mockApi(page: Page, opts: { text?: VerseText; delayMs?: number } = {}) {
  const text = opts.text ?? placeholderText;
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^.*\/api/, "");
    const json = (body: unknown) => route.fulfill({ json: body });
    if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));

    if (path === "/surahs") return json(Array.from({ length: SURAH_COUNT }, (_, i) => surah(i + 1)));
    let m = path.match(/^\/surahs\/(\d+)\/verses$/);
    if (m) {
      const s = Number(m[1]);
      return json({ surah: surah(s), totalCount: ayahCount(s), verses: Array.from({ length: ayahCount(s) }, (_, i) => verse(s, i + 1, text)) });
    }
    m = path.match(/^\/pages\/(\d+)$/);
    if (m) {
      const p = Number(m[1]);
      const from = pageStart(p);
      const to = pageEnd(p);
      const verses = [];
      for (let s = from.surah; s <= to.surah; s++) {
        const first = s === from.surah ? from.ayah : 1;
        const last = s === to.surah ? to.ayah : ayahCount(s);
        for (let a = first; a <= last; a++) verses.push(verse(s, a, text));
      }
      return json({ pageNumber: p, verses, surahsOnPage: [...new Set(verses.map((v) => Number(v.verseKey.split(":")[0])))] });
    }
    m = path.match(/^\/verses\/(\d+)\/(\d+)\/tafsir$/);
    if (m) {
      return json({ verseKey: `${m[1]}:${m[2]}`, text: "نص تفسير تجريبي.", tafsirName: "تجريبي", surahName: surahName(Number(m[1])), verseNumber: Number(m[2]), surahNumber: Number(m[1]) });
    }
    if (path === "/search") {
      const q = url.searchParams.get("q") ?? "";
      const hits = Array.from({ length: SURAH_COUNT }, (_, i) => surah(i + 1)).filter((s) => s.name.includes(q) || String(s.number) === q);
      return json({ surahs: hits, totalCount: hits.length });
    }
    if (path === "/juz") return json([]);
    return route.fulfill({ status: 404, json: { error: "not mocked" } });
  });
}
