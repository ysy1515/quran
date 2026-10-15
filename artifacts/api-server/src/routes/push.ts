import { Router, type IRouter } from "express";
import webpush from "web-push";
import { z } from "zod";
import type { PushSubscription } from "@workspace/db";
import {
  deleteSubscription,
  listSubscriptions,
  updateSubscription,
  upsertSubscription,
} from "../lib/pushStore";
import { writeLimiter } from "../lib/security";

const router: IRouter = Router();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:quran@app.com";

const vapidConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (vapidConfigured) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY!, VAPID_PRIVATE_KEY!);
}

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

// Push service endpoints are long https URLs; anything else is rejected.
const endpoint = z.string().url().max(2048).refine((u) => u.startsWith("https://"), "https only");

const SubscribeBody = z.object({
  endpoint,
  keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }),
  notifyQuran: z.boolean().default(true),
  notifyDhikr: z.boolean().default(true),
  notifQuran1: time.optional(),
  notifQuran2: time.optional(),
  notifDhikr: time.optional(),
});

const EndpointBody = z.object({ endpoint });

const PreferencesBody = z.object({
  endpoint,
  notifyQuran: z.boolean().optional(),
  notifyDhikr: z.boolean().optional(),
});

const TimesBody = z.object({
  endpoint,
  notifQuran1: time.optional(),
  notifQuran2: time.optional(),
  notifDhikr: time.optional(),
});

function definedOnly<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

// GET /api/push/vapid-public-key
router.get("/vapid-public-key", (_req, res) => {
  if (!vapidConfigured) {
    res.status(503).json({ error: "Push notifications are not configured" });
    return;
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe
router.post("/subscribe", writeLimiter, async (req, res): Promise<void> => {
  const parsed = SubscribeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid subscription" });
    return;
  }
  const { endpoint, keys, notifyQuran, notifyDhikr, ...times } = parsed.data;
  try {
    await upsertSubscription({
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      notifyQuran,
      notifyDhikr,
      ...definedOnly(times),
    });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save subscription");
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

// DELETE /api/push/unsubscribe
router.delete("/unsubscribe", writeLimiter, async (req, res): Promise<void> => {
  const parsed = EndpointBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing endpoint" });
    return;
  }
  try {
    await deleteSubscription(parsed.data.endpoint);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to unsubscribe");
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

// PUT /api/push/preferences
router.put("/preferences", writeLimiter, async (req, res): Promise<void> => {
  const parsed = PreferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid preferences" });
    return;
  }
  const { endpoint, ...changes } = parsed.data;
  try {
    const found = await updateSubscription(endpoint, definedOnly(changes));
    if (!found) {
      res.status(404).json({ error: "Subscription not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update preferences");
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

// PUT /api/push/times — reminder times for one subscription only.
router.put("/times", writeLimiter, async (req, res): Promise<void> => {
  const parsed = TimesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid times. Use HH:MM and include the subscription endpoint" });
    return;
  }
  const { endpoint, ...times } = parsed.data;
  try {
    const found = await updateSubscription(endpoint, definedOnly(times));
    if (!found) {
      res.status(404).json({ error: "Subscription not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to save times");
    res.status(500).json({ error: "Failed to save times" });
  }
});

export type PushPayload = { title: string; body: string; icon?: string; badge?: string; tag?: string };

/**
 * Sends one payload to the given subscriptions. Subscriptions the push service
 * reports as gone (404/410) are deleted. Nothing else is sent to anyone.
 */
export async function sendPush(
  subs: PushSubscription[],
  payload: PushPayload,
): Promise<{ sent: number; failed: number; removed: number }> {
  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body),
    ),
  );

  let removed = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    if (r.status !== "rejected") continue;
    const status = (r.reason as { statusCode?: number } | undefined)?.statusCode;
    if (status === 404 || status === 410) {
      await deleteSubscription(subs[i]!.endpoint);
      removed++;
    }
  }
  const failed = results.filter((r) => r.status === "rejected").length;
  return { sent: results.length - failed, failed, removed };
}

export { listSubscriptions };

export default router;
