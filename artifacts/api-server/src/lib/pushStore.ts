import { db, pushSubscriptionsTable, type PushSubscription } from "@workspace/db";
import { eq } from "drizzle-orm";

// All database access for web push subscriptions. Every write is keyed by the
// subscription endpoint, an unguessable URL issued by the browser's push service,
// so a caller can only change the subscription it owns.

export type ReminderTimes = {
  notifQuran1: string;
  notifQuran2: string;
  notifDhikr: string;
};

export type NewSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
  notifyQuran: boolean;
  notifyDhikr: boolean;
} & Partial<ReminderTimes>;

export async function upsertSubscription(sub: NewSubscription): Promise<void> {
  const { endpoint, ...rest } = sub;
  await db
    .insert(pushSubscriptionsTable)
    .values(sub)
    .onConflictDoUpdate({ target: pushSubscriptionsTable.endpoint, set: rest });
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint));
}

/** Returns false when no subscription exists for this endpoint. */
export async function updateSubscription(
  endpoint: string,
  changes: Partial<Pick<PushSubscription, "notifyQuran" | "notifyDhikr"> & ReminderTimes>,
): Promise<boolean> {
  const updated = await db
    .update(pushSubscriptionsTable)
    .set(changes)
    .where(eq(pushSubscriptionsTable.endpoint, endpoint))
    .returning({ id: pushSubscriptionsTable.id });
  return updated.length > 0;
}

export async function listSubscriptions(): Promise<PushSubscription[]> {
  return db.select().from(pushSubscriptionsTable);
}
