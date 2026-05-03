import { Router, type IRouter } from "express";
import { db, bookmarksTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreateBookmarkBody, DeleteBookmarkParams } from "@workspace/api-zod";

const router: IRouter = Router();

const SESSION_ID = "default";

router.get("/bookmarks", async (req, res): Promise<void> => {
  try {
    const bookmarks = await db
      .select()
      .from(bookmarksTable)
      .where(eq(bookmarksTable.sessionId, SESSION_ID))
      .orderBy(desc(bookmarksTable.createdAt));

    res.json(bookmarks);
  } catch (err) {
    req.log.error({ err }, "Error fetching bookmarks");
    res.status(500).json({ error: "Failed to fetch bookmarks" });
  }
});

router.post("/bookmarks", async (req, res): Promise<void> => {
  const parsed = CreateBookmarkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [bookmark] = await db
      .insert(bookmarksTable)
      .values({
        ...parsed.data,
        sessionId: SESSION_ID,
      })
      .returning();

    res.status(201).json(bookmark);
  } catch (err) {
    req.log.error({ err }, "Error creating bookmark");
    res.status(500).json({ error: "Failed to create bookmark" });
  }
});

router.delete("/bookmarks/:id", async (req, res): Promise<void> => {
  const params = DeleteBookmarkParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    await db
      .delete(bookmarksTable)
      .where(
        and(
          eq(bookmarksTable.id, params.data.id),
          eq(bookmarksTable.sessionId, SESSION_ID)
        )
      );

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error deleting bookmark");
    res.status(500).json({ error: "Failed to delete bookmark" });
  }
});

export default router;
