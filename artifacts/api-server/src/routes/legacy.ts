import { Router, type IRouter } from "express";

// Compatibility for app builds released before Phase 1 (still installed from
// TestFlight). Those builds read and wrote one database row shared by every
// user. These handlers keep the old screens rendering but never read or store
// anything: reads return fixed defaults, writes are refused with 410 Gone.
//
// Remove once no pre-Phase-1 build can still be installed. TestFlight builds
// expire 90 days after upload.

const router: IRouter = Router();

const GONE = { error: "حدّث التطبيق إلى أحدث إصدار — هذه الميزة تُحفظ الآن على جهازك" };
const EPOCH = new Date(0).toISOString();

router.get("/bookmarks", (_req, res) => {
  res.json([]);
});

router.get("/reading-progress", (_req, res) => {
  res.json({
    id: 0,
    lastPageNumber: 1,
    lastSurahNumber: 1,
    lastVerseNumber: 1,
    lastSurahName: "الفاتحة",
    updatedAt: EPOCH,
  });
});

router.get("/settings", (_req, res) => {
  res.json({ id: 0, theme: "light", fontSize: 100, showTafsir: true, defaultTafsirId: 169, updatedAt: EPOCH });
});

router.get("/stats", (_req, res) => {
  res.json({
    totalBookmarks: 0,
    lastReadPage: 1,
    lastReadSurah: "الفاتحة",
    completedJuz: 0,
    readingStreak: 0,
    pagesRead: 0,
  });
});

router.post("/bookmarks", (_req, res) => {
  res.status(410).json(GONE);
});
router.delete("/bookmarks/:id", (_req, res) => {
  res.status(410).json(GONE);
});
router.put("/reading-progress", (_req, res) => {
  res.status(410).json(GONE);
});
router.put("/settings", (_req, res) => {
  res.status(410).json(GONE);
});

export default router;
