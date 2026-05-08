import { Router, type IRouter } from "express";
import webpush from "web-push";
import { db, pushSubscriptionsTable, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:quran@app.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// GET /api/push/vapid-public-key
router.get("/vapid-public-key", (_req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe
router.post("/subscribe", async (req, res): Promise<void> => {
  const { endpoint, keys, notifyQuran = true, notifyDhikr = true } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: "Invalid subscription" });
    return;
  }
  try {
    await db
      .insert(pushSubscriptionsTable)
      .values({
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        notifyQuran,
        notifyDhikr,
      })
      .onConflictDoUpdate({
        target: pushSubscriptionsTable.endpoint,
        set: { notifyQuran, notifyDhikr, p256dh: keys.p256dh, auth: keys.auth },
      });
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

// DELETE /api/push/unsubscribe
router.delete("/unsubscribe", async (req, res): Promise<void> => {
  const { endpoint } = req.body;
  if (!endpoint) { res.status(400).json({ error: "Missing endpoint" }); return; }
  try {
    await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

// GET /api/push/times
router.get("/times", async (_req, res): Promise<void> => {
  try {
    const [settings] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.sessionId, "default")).limit(1);
    res.json({
      notifQuran1: settings?.notifQuran1 ?? "12:00",
      notifQuran2: settings?.notifQuran2 ?? "18:00",
      notifDhikr:  settings?.notifDhikr  ?? "21:00",
    });
  } catch {
    res.json({ notifQuran1: "12:00", notifQuran2: "18:00", notifDhikr: "21:00" });
  }
});

// PUT /api/push/times
router.put("/times", async (req, res): Promise<void> => {
  const { notifQuran1, notifQuran2, notifDhikr } = req.body as { notifQuran1?: string; notifQuran2?: string; notifDhikr?: string };
  const timeRe = /^\d{2}:\d{2}$/;
  if ((notifQuran1 && !timeRe.test(notifQuran1)) ||
      (notifQuran2 && !timeRe.test(notifQuran2)) ||
      (notifDhikr  && !timeRe.test(notifDhikr))) {
    res.status(400).json({ error: "Invalid time format. Use HH:MM" });
    return;
  }
  try {
    const existing = await db.select().from(appSettingsTable).where(eq(appSettingsTable.sessionId, "default")).limit(1);
    if (existing.length === 0) {
      await db.insert(appSettingsTable).values({ sessionId: "default", notifQuran1: notifQuran1 ?? "12:00", notifQuran2: notifQuran2 ?? "18:00", notifDhikr: notifDhikr ?? "21:00" });
    } else {
      await db.update(appSettingsTable).set({
        ...(notifQuran1 ? { notifQuran1 } : {}),
        ...(notifQuran2 ? { notifQuran2 } : {}),
        ...(notifDhikr  ? { notifDhikr }  : {}),
        updatedAt: new Date(),
      }).where(eq(appSettingsTable.sessionId, "default"));
    }
    res.json({ ok: true, notifQuran1, notifQuran2, notifDhikr });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to save times" });
  }
});

// PUT /api/push/preferences
router.put("/preferences", async (req, res): Promise<void> => {
  const { endpoint, notifyQuran, notifyDhikr } = req.body;
  if (!endpoint) { res.status(400).json({ error: "Missing endpoint" }); return; }
  try {
    await db
      .update(pushSubscriptionsTable)
      .set({ notifyQuran, notifyDhikr })
      .where(eq(pushSubscriptionsTable.endpoint, endpoint));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

// Helper used by scheduler
export async function sendPushToAll(
  filter: "quran" | "dhikr",
  payload: { title: string; body: string; icon?: string; badge?: string; tag?: string }
) {
  const subs = await db.select().from(pushSubscriptionsTable);
  const results = await Promise.allSettled(
    subs
      .filter((s) => (filter === "quran" ? s.notifyQuran : s.notifyDhikr))
      .map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload)
        )
      )
  );
  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length > 0) {
    // Clean up expired subscriptions
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: "ping" })
        );
      } catch (err: unknown) {
        if (err && typeof err === "object" && "statusCode" in err &&
            ((err as { statusCode: number }).statusCode === 410 || (err as { statusCode: number }).statusCode === 404)) {
          await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
        }
      }
    }
  }
  return { sent: results.length - failed.length, failed: failed.length };
}

export default router;
