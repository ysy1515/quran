import { Router, type IRouter, type Request } from "express";
import { createHash, randomBytes } from "node:crypto";
import webpush from "web-push";
import { z } from "zod";
import type { PushSubscription } from "@workspace/db";
import {
  deleteSubscriptionById,
  deleteSubscriptionByToken,
  insertSubscription,
  listSubscriptions,
  updateSubscriptionByToken,
} from "../lib/pushStore";
import { writeLimiter } from "../lib/security";
import { logger } from "../lib/logger";
import { readVapidConfig } from "../lib/vapid";

// Ownership model: POST /subscribe creates a subscription and returns a random
// management token exactly once. Only its SHA-256 hash is stored. Every later
// change or deletion must send that token as "Authorization: Bearer <token>".
// The subscription endpoint URL is never used to authorize anything, and an
// endpoint that is already registered can't be registered again.

const router: IRouter = Router();

const vapid = readVapidConfig();
if (vapid.ok) {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  logger.info({ publicKeyFingerprint: vapid.publicKeyFingerprint }, "Web push enabled");
} else if (vapid.reason === "leaked-key") {
  logger.error("Web push disabled: the configured VAPID keys are the ones exposed in the repository. Rotate them in Replit Secrets.");
} else {
  logger.warn("Web push disabled: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set");
}

export const pushEnabled = vapid.ok;

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

const PreferencesBody = z.object({
  notifyQuran: z.boolean().optional(),
  notifyDhikr: z.boolean().optional(),
});

const TimesBody = z.object({
  notifQuran1: time.optional(),
  notifQuran2: time.optional(),
  notifDhikr: time.optional(),
});

function definedOnly<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Hash of the bearer token, or null if the header is missing or malformed. */
function bearerTokenHash(req: Request): string | null {
  const m = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.get("authorization") ?? "");
  return m ? hashToken(m[1]!) : null;
}

// Same response for "no token", "wrong token" and "no such subscription", so the
// API reveals nothing about which subscriptions exist.
const NOT_FOUND = { error: "Subscription not found" };

// GET /api/push/vapid-public-key
router.get("/vapid-public-key", (_req, res) => {
  if (!vapid.ok) {
    res.status(503).json({ error: "Push notifications are not configured" });
    return;
  }
  res.json({ publicKey: vapid.publicKey });
});

// POST /api/push/subscribe
router.post("/subscribe", writeLimiter, async (req, res): Promise<void> => {
  if (!vapid.ok) {
    res.status(503).json({ error: "Push notifications are not configured" });
    return;
  }
  const parsed = SubscribeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid subscription" });
    return;
  }
  const { endpoint, keys, notifyQuran, notifyDhikr, ...times } = parsed.data;
  const manageToken = randomBytes(32).toString("base64url");
  try {
    const created = await insertSubscription({
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      notifyQuran,
      notifyDhikr,
      manageTokenHash: hashToken(manageToken),
      ...definedOnly(times),
    });
    if (!created) {
      // Already registered. The browser should drop this subscription and
      // create a new one (which gets a new endpoint).
      res.status(409).json({ error: "Subscription already registered" });
      return;
    }
    res.status(201).json({ ok: true, manageToken });
  } catch (err) {
    req.log.error({ err }, "Failed to save subscription");
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

// DELETE /api/push/unsubscribe
router.delete("/unsubscribe", writeLimiter, async (req, res): Promise<void> => {
  const tokenHash = bearerTokenHash(req);
  if (!tokenHash) {
    res.status(404).json(NOT_FOUND);
    return;
  }
  try {
    if (!(await deleteSubscriptionByToken(tokenHash))) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to unsubscribe");
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

async function updateOwned(req: Request, changes: Record<string, unknown>) {
  const tokenHash = bearerTokenHash(req);
  if (!tokenHash) return false;
  return updateSubscriptionByToken(tokenHash, changes);
}

// PUT /api/push/preferences
router.put("/preferences", writeLimiter, async (req, res): Promise<void> => {
  const parsed = PreferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid preferences" });
    return;
  }
  try {
    if (!(await updateOwned(req, definedOnly(parsed.data)))) {
      res.status(404).json(NOT_FOUND);
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update preferences");
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

// PUT /api/push/times
router.put("/times", writeLimiter, async (req, res): Promise<void> => {
  const parsed = TimesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid times. Use HH:MM" });
    return;
  }
  try {
    if (!(await updateOwned(req, definedOnly(parsed.data)))) {
      res.status(404).json(NOT_FOUND);
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
      await deleteSubscriptionById(subs[i]!.id);
      removed++;
    }
  }
  const failed = results.filter((r) => r.status === "rejected").length;
  return { sent: results.length - failed, failed, removed };
}

export { listSubscriptions };

export default router;
