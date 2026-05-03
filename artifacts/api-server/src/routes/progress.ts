import { Router, type IRouter } from "express";
import { db, readingProgressTable, bookmarksTable, appSettingsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { UpdateReadingProgressBody } from "@workspace/api-zod";

const router: IRouter = Router();
const SESSION_ID = "default";

router.get("/reading-progress", async (req, res): Promise<void> => {
  try {
    const [progress] = await db
      .select()
      .from(readingProgressTable)
      .where(eq(readingProgressTable.sessionId, SESSION_ID))
      .limit(1);

    if (!progress) {
      // Create default progress
      const [created] = await db
        .insert(readingProgressTable)
        .values({
          sessionId: SESSION_ID,
          lastPageNumber: 1,
          lastSurahNumber: 1,
          lastVerseNumber: 1,
          lastSurahName: "الفاتحة",
        })
        .returning();
      res.json(created);
      return;
    }

    res.json(progress);
  } catch (err) {
    req.log.error({ err }, "Error fetching reading progress");
    res.status(500).json({ error: "Failed to fetch reading progress" });
  }
});

router.put("/reading-progress", async (req, res): Promise<void> => {
  const parsed = UpdateReadingProgressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const existing = await db
      .select()
      .from(readingProgressTable)
      .where(eq(readingProgressTable.sessionId, SESSION_ID))
      .limit(1);

    let progress;
    if (existing.length === 0) {
      const [created] = await db
        .insert(readingProgressTable)
        .values({
          sessionId: SESSION_ID,
          ...parsed.data,
        })
        .returning();
      progress = created;
    } else {
      const [updated] = await db
        .update(readingProgressTable)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(readingProgressTable.sessionId, SESSION_ID))
        .returning();
      progress = updated;
    }

    res.json(progress);
  } catch (err) {
    req.log.error({ err }, "Error updating reading progress");
    res.status(500).json({ error: "Failed to update reading progress" });
  }
});

router.get("/stats", async (req, res): Promise<void> => {
  try {
    const [bookmarkCount] = await db
      .select({ count: count() })
      .from(bookmarksTable)
      .where(eq(bookmarksTable.sessionId, SESSION_ID));

    const [progress] = await db
      .select()
      .from(readingProgressTable)
      .where(eq(readingProgressTable.sessionId, SESSION_ID))
      .limit(1);

    const lastPage = progress?.lastPageNumber ?? 1;
    const completedJuz = Math.floor(lastPage / (604 / 30));

    res.json({
      totalBookmarks: bookmarkCount?.count ?? 0,
      lastReadPage: lastPage,
      lastReadSurah: progress?.lastSurahName ?? "الفاتحة",
      completedJuz,
      readingStreak: 0,
      pagesRead: lastPage,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching stats");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
