import { Router, type IRouter } from "express";
import {
  GetSurahVersesParams,
  GetSurahVersesQueryParams,
  GetVerseTafsirParams,
  GetVerseTafsirQueryParams,
  GetPageParams,
  SearchQuranQueryParams,
} from "@workspace/api-zod";
import { db, tafsirCacheTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { ayahCount, isValidAyah, isValidSurah } from "@workspace/quran-meta";

const QURAN_API_BASE =
  process.env.QURAN_API_BASE ?? "https://api.quran.com/api/v4";
const TAFSIR_ID_DEFAULT = 14; // Ibn Kathir Arabic (14 = Arabic, 169 = English abridged)
// Tafsir editions the app offers; other ids are refused so the cache table only
// holds content the app can show.
const ALLOWED_TAFSIR_IDS = new Set([14, 169]);
const FETCH_TIMEOUT_MS = 12000; // 12 seconds

function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

const router: IRouter = Router();

// List all 114 surahs
router.get("/surahs", async (req, res): Promise<void> => {
  try {
    const resp = await fetchWithTimeout(`${QURAN_API_BASE}/chapters?language=ar`, {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) {
      res
        .status(502)
        .json({ error: "Failed to fetch surahs from Quran.com API" });
      return;
    }
    const data = (await resp.json()) as {
      chapters: Array<{
        id: number;
        name_simple: string;
        name_arabic: string;
        translated_name: { name: string };
        revelation_place: string;
        verses_count: number;
        pages: [number, number];
      }>;
    };

    const surahs = data.chapters.map((ch) => ({
      id: ch.id,
      number: ch.id,
      name: ch.name_arabic,
      nameSimple: ch.name_simple,
      nameTranslation: ch.translated_name?.name ?? "",
      revelationType:
        ch.revelation_place === "makkah" ? "Meccan" : "Medinan",
      versesCount: ch.verses_count,
      pageNumber: ch.pages?.[0] ?? 1,
      juzNumber: 1,
    }));

    res.json(surahs);
  } catch (err) {
    req.log.error({ err }, "Error fetching surahs");
    res.status(502).json({ error: "Failed to fetch surahs" });
  }
});

type UpstreamVerse = {
  id: number;
  verse_key: string;
  verse_number: number;
  text_uthmani: string;
  page_number: number;
  juz_number: number;
  hizb_number: number;
  translations?: Array<{ text: string; resource_id: number }>;
};

// Quran.com documents a maximum of 50 records per request. Fetching in pages of
// 50 works whether or not that limit is enforced.
const UPSTREAM_PAGE_SIZE = 50;

export class IncompleteSurahError extends Error {}

/**
 * Fetches every ayah of a surah from Quran.com and checks that the result is
 * exactly ayat 1..N in order, where N comes from the reference table. The Arabic
 * text is returned exactly as received.
 */
export async function fetchCompleteSurah(
  surah: number,
  fetchFn: (url: string) => Promise<Response> = (url) =>
    fetchWithTimeout(url, { headers: { Accept: "application/json" } }),
): Promise<UpstreamVerse[]> {
  const expected = ayahCount(surah);
  const pages = Math.ceil(expected / UPSTREAM_PAGE_SIZE);
  const responses = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      fetchFn(
        `${QURAN_API_BASE}/verses/by_chapter/${surah}?language=ar&words=false&page=${i + 1}&per_page=${UPSTREAM_PAGE_SIZE}&fields=text_uthmani,page_number,juz_number,hizb_number&translations=20`,
      ),
    ),
  );
  const verses: UpstreamVerse[] = [];
  for (const resp of responses) {
    if (!resp.ok) throw new Error(`Quran.com responded ${resp.status}`);
    const data = (await resp.json()) as { verses: UpstreamVerse[] };
    verses.push(...data.verses);
  }

  const ok =
    verses.length === expected &&
    verses.every((v, i) => v.verse_number === i + 1 && v.verse_key === `${surah}:${i + 1}`);
  if (!ok) {
    throw new IncompleteSurahError(
      `Surah ${surah}: expected ayat 1..${expected}, received ${verses.length}`,
    );
  }
  return verses;
}

// Get verses for a surah
router.get("/surahs/:number/verses", async (req, res): Promise<void> => {
  const params = GetSurahVersesParams.safeParse(req.params);
  if (!params.success || !isValidSurah(params.data.number)) {
    res.status(400).json({ error: "Invalid surah number" });
    return;
  }

  const query = GetSurahVersesQueryParams.safeParse(req.query);
  const page = query.success ? Math.max(1, query.data.page ?? 1) : 1;
  const perPage = query.success ? Math.max(1, query.data.perPage ?? 50) : 50;

  try {
    const [allVerses, chapterResp] = await Promise.all([
      fetchCompleteSurah(params.data.number),
      fetchWithTimeout(
        `${QURAN_API_BASE}/chapters/${params.data.number}?language=ar`,
        { headers: { Accept: "application/json" } }
      ),
    ]);

    if (!chapterResp.ok) {
      res.status(502).json({ error: "Failed to fetch verses from Quran.com API" });
      return;
    }

    const chapterData = (await chapterResp.json()) as {
      chapter: {
        id: number;
        name_simple: string;
        name_arabic: string;
        translated_name: { name: string };
        revelation_place: string;
        verses_count: number;
        pages: [number, number];
      };
    };

    const ch = chapterData.chapter;
    const surah = {
      id: ch.id,
      number: ch.id,
      name: ch.name_arabic,
      nameSimple: ch.name_simple,
      nameTranslation: ch.translated_name?.name ?? "",
      revelationType:
        ch.revelation_place === "makkah" ? "Meccan" : ("Medinan" as const),
      versesCount: ch.verses_count,
      pageNumber: ch.pages?.[0] ?? 1,
      juzNumber: allVerses[0]?.juz_number ?? 1,
    };

    const verses = allVerses.slice((page - 1) * perPage, page * perPage).map((v) => ({
      id: v.verse_key,
      verseKey: v.verse_key,
      verseNumber: v.verse_number,
      text: v.text_uthmani,
      translationText: v.translations?.[0]?.text?.replace(/<[^>]*>/g, "").trim() ?? null,
      pageNumber: v.page_number,
      juzNumber: v.juz_number,
      hizbNumber: v.hizb_number ?? 0,
    }));

    res.json({
      verses,
      surah,
      totalCount: allVerses.length,
    });
  } catch (err) {
    if (err instanceof IncompleteSurahError) {
      req.log.error({ err }, "Incomplete surah from Quran.com");
      res.status(502).json({ error: "Incomplete surah data from source" });
      return;
    }
    req.log.error({ err }, "Error fetching surah verses");
    res.status(502).json({ error: "Failed to fetch verses" });
  }
});

// Get tafsir for a specific verse
router.get(
  "/verses/:surahNumber/:verseNumber/tafsir",
  async (req, res): Promise<void> => {
    const params = GetVerseTafsirParams.safeParse(req.params);
    if (!params.success || !isValidAyah(params.data.surahNumber, params.data.verseNumber)) {
      res.status(400).json({ error: "Invalid surah or verse number" });
      return;
    }

    const qp = GetVerseTafsirQueryParams.safeParse(req.query);
    const tafsirId = qp.success
      ? (qp.data.tafsirId ?? TAFSIR_ID_DEFAULT)
      : TAFSIR_ID_DEFAULT;
    if (!ALLOWED_TAFSIR_IDS.has(tafsirId)) {
      res.status(400).json({ error: "Unsupported tafsir" });
      return;
    }

    const { surahNumber, verseNumber } = params.data;
    const verseKey = `${surahNumber}:${verseNumber}`;

    // Check cache
    try {
      const cached = await db
        .select()
        .from(tafsirCacheTable)
        .where(
          and(
            eq(tafsirCacheTable.surahNumber, surahNumber),
            eq(tafsirCacheTable.verseNumber, verseNumber),
            eq(tafsirCacheTable.tafsirId, tafsirId)
          )
        )
        .limit(1);

      if (cached.length > 0) {
        res.json({
          verseKey,
          text: cached[0].tafsirText,
          tafsirName: cached[0].tafsirName,
          surahName: "",
          verseNumber,
          surahNumber,
        });
        return;
      }
    } catch (err) {
      req.log.warn({ err }, "Cache lookup failed, proceeding to API");
    }

    // Fetch from Quran.com API
    try {
      const [tafsirResp, verseResp] = await Promise.all([
        fetchWithTimeout(
          `${QURAN_API_BASE}/tafsirs/${tafsirId}/by_ayah/${verseKey}`,
          { headers: { Accept: "application/json" } }
        ),
        fetchWithTimeout(
          `${QURAN_API_BASE}/verses/by_key/${verseKey}?language=ar&fields=text_uthmani`,
          { headers: { Accept: "application/json" } }
        ),
      ]);

      if (!tafsirResp.ok) {
        if (tafsirResp.status === 404) {
          res.status(404).json({ error: "التفسير غير متوفر لهذه الآية" });
          return;
        }
        res.status(503).json({ error: "خدمة التفسير غير متاحة حالياً" });
        return;
      }

      const tafsirData = (await tafsirResp.json()) as {
        tafsir: {
          text: string;
          resource_name?: string;
        };
      };

      const tafsirText = tafsirData.tafsir?.text ?? "";
      const tafsirName =
        tafsirData.tafsir?.resource_name ?? "تفسير ابن كثير";

      // Store in cache (async, non-blocking)
      db.insert(tafsirCacheTable)
        .values({
          surahNumber,
          verseNumber,
          tafsirId,
          tafsirText,
          tafsirName,
        })
        .catch((err: unknown) => {
          req.log.warn({ err }, "Failed to cache tafsir");
        });

      res.json({
        verseKey,
        text: tafsirText,
        tafsirName,
        surahName: "",
        verseNumber,
        surahNumber,
      });
    } catch (err) {
      req.log.error({ err }, "Error fetching tafsir");
      res.status(503).json({ error: "خدمة التفسير غير متاحة حالياً" });
    }
  }
);

// Get verses for a page
router.get("/pages/:pageNumber", async (req, res): Promise<void> => {
  const params = GetPageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const resp = await fetchWithTimeout(
      `${QURAN_API_BASE}/verses/by_page/${params.data.pageNumber}?language=ar&words=false&fields=text_uthmani,page_number,juz_number,hizb_number`,
      { headers: { Accept: "application/json" } }
    );

    if (!resp.ok) {
      res.status(502).json({ error: "Failed to fetch page verses" });
      return;
    }

    const data = (await resp.json()) as {
      verses: Array<{
        id: number;
        verse_key: string;
        verse_number: number;
        text_uthmani: string;
        page_number: number;
        juz_number: number;
        hizb_number: number;
      }>;
    };

    const verses = data.verses.map((v) => ({
      id: v.verse_key,
      verseKey: v.verse_key,
      verseNumber: v.verse_number,
      text: v.text_uthmani,
      pageNumber: v.page_number,
      juzNumber: v.juz_number,
      hizbNumber: v.hizb_number ?? 0,
    }));

    const surahsOnPage = [
      ...new Set(
        data.verses.map((v) => parseInt(v.verse_key.split(":")[0] ?? "0", 10))
      ),
    ];

    res.json({
      pageNumber: params.data.pageNumber,
      verses,
      surahsOnPage,
      imageUrl: null,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching page");
    res.status(502).json({ error: "Failed to fetch page" });
  }
});

// List all juz
router.get("/juz", async (req, res): Promise<void> => {
  try {
    const resp = await fetchWithTimeout(`${QURAN_API_BASE}/juzs`, {
      headers: { Accept: "application/json" },
    });

    if (!resp.ok) {
      res.status(502).json({ error: "Failed to fetch juz" });
      return;
    }

    const data = (await resp.json()) as {
      juzs: Array<{
        id: number;
        juz_number: number;
        verse_mapping: Record<string, string>;
        first_verse_id: number;
        last_verse_id: number;
        verses_count: number;
      }>;
    };

    const juzList = data.juzs.map((j) => ({
      juzNumber: j.juz_number,
      verseMapping: j.verse_mapping,
      firstVerseId: j.first_verse_id,
      lastVerseId: j.last_verse_id,
      versesCount: j.verses_count,
    }));

    res.json(juzList);
  } catch (err) {
    req.log.error({ err }, "Error fetching juz");
    res.status(502).json({ error: "Failed to fetch juz" });
  }
});

// Search surahs
router.get("/search", async (req, res): Promise<void> => {
  const qp = SearchQuranQueryParams.safeParse(req.query);
  if (!qp.success) {
    res.status(400).json({ error: qp.error.message });
    return;
  }

  try {
    const resp = await fetchWithTimeout(`${QURAN_API_BASE}/chapters?language=ar`, {
      headers: { Accept: "application/json" },
    });

    if (!resp.ok) {
      res.status(502).json({ error: "Failed to search" });
      return;
    }

    const data = (await resp.json()) as {
      chapters: Array<{
        id: number;
        name_simple: string;
        name_arabic: string;
        translated_name: { name: string };
        revelation_place: string;
        verses_count: number;
        pages: [number, number];
      }>;
    };

    const q = qp.data.q.toLowerCase();
    const filtered = data.chapters.filter(
      (ch) =>
        ch.name_arabic.includes(q) ||
        ch.name_simple.toLowerCase().includes(q) ||
        ch.translated_name?.name?.toLowerCase().includes(q) ||
        ch.id.toString() === q
    );

    const surahs = filtered.map((ch) => ({
      id: ch.id,
      number: ch.id,
      name: ch.name_arabic,
      nameSimple: ch.name_simple,
      nameTranslation: ch.translated_name?.name ?? "",
      revelationType:
        ch.revelation_place === "makkah" ? "Meccan" : ("Medinan" as const),
      versesCount: ch.verses_count,
      pageNumber: ch.pages?.[0] ?? 1,
      juzNumber: 1,
    }));

    res.json({ surahs, totalCount: surahs.length });
  } catch (err) {
    req.log.error({ err }, "Error searching");
    res.status(502).json({ error: "Search failed" });
  }
});

export default router;
