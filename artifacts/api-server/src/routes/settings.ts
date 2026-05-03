import { Router, type IRouter } from "express";
import { db, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateSettingsBody } from "@workspace/api-zod";

const router: IRouter = Router();
const SESSION_ID = "default";

router.get("/settings", async (req, res): Promise<void> => {
  try {
    const [settings] = await db
      .select()
      .from(appSettingsTable)
      .where(eq(appSettingsTable.sessionId, SESSION_ID))
      .limit(1);

    if (!settings) {
      const [created] = await db
        .insert(appSettingsTable)
        .values({
          sessionId: SESSION_ID,
          theme: "light",
          fontSize: 100,
          showTafsir: true,
          defaultTafsirId: 169,
        })
        .returning();
      res.json(created);
      return;
    }

    res.json(settings);
  } catch (err) {
    req.log.error({ err }, "Error fetching settings");
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

router.put("/settings", async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const existing = await db
      .select()
      .from(appSettingsTable)
      .where(eq(appSettingsTable.sessionId, SESSION_ID))
      .limit(1);

    let settings;
    if (existing.length === 0) {
      const [created] = await db
        .insert(appSettingsTable)
        .values({
          sessionId: SESSION_ID,
          theme: parsed.data.theme ?? "light",
          fontSize: parsed.data.fontSize ?? 100,
          showTafsir: parsed.data.showTafsir ?? true,
          defaultTafsirId: parsed.data.defaultTafsirId ?? 169,
        })
        .returning();
      settings = created;
    } else {
      const [updated] = await db
        .update(appSettingsTable)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(appSettingsTable.sessionId, SESSION_ID))
        .returning();
      settings = updated;
    }

    res.json(settings);
  } catch (err) {
    req.log.error({ err }, "Error updating settings");
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
