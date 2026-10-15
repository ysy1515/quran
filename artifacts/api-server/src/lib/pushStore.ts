import { db, pushSubscriptionsTable, type PushSubscription } from "@workspace/db";
import { eq, isNotNull } from "drizzle-orm";

// All database access for web push subscriptions. A subscription is created once
// and afterwards found only by the hash of its secret management token, so
// knowing a subscription's endpoint URL gives no way to change or delete it.

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
  manageTokenHash: string;
} & Partial<ReminderTimes>;

export type SubscriptionChanges = Partial<Pick<PushSubscription, "notifyQuran" | "notifyDhikr"> & ReminderTimes>;

/** Inserts a new subscription. Returns false if the endpoint is already registered. */
export async function insertSubscription(sub: NewSubscription): Promise<boolean> {
  const inserted = await db
    .insert(pushSubscriptionsTable)
    .values(sub)
    .onConflictDoNothing({ target: pushSubscriptionsTable.endpoint })
    .returning({ id: pushSubscriptionsTable.id });
  return inserted.length > 0;
}

/** Updates the subscription owning this token hash. Returns false if none. */
export async function updateSubscriptionByToken(tokenHash: string, changes: SubscriptionChanges): Promise<boolean> {
  if (Object.keys(changes).length === 0) {
    const found = await db
      .select({ id: pushSubscriptionsTable.id })
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.manageTokenHash, tokenHash))
      .limit(1);
    return found.length > 0;
  }
  const updated = await db
    .update(pushSubscriptionsTable)
    .set(changes)
    .where(eq(pushSubscriptionsTable.manageTokenHash, tokenHash))
    .returning({ id: pushSubscriptionsTable.id });
  return updated.length > 0;
}

/** Deletes the subscription owning this token hash. Returns false if none. */
export async function deleteSubscriptionByToken(tokenHash: string): Promise<boolean> {
  const deleted = await db
    .delete(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.manageTokenHash, tokenHash))
    .returning({ id: pushSubscriptionsTable.id });
  return deleted.length > 0;
}

/** Server-side cleanup when the push service reports a subscription as gone. */
export async function deleteSubscriptionById(id: number): Promise<void> {
  await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, id));
}

/** Subscriptions eligible for sending: only those created with a management token. */
export async function listSubscriptions(): Promise<PushSubscription[]> {
  return db.select().from(pushSubscriptionsTable).where(isNotNull(pushSubscriptionsTable.manageTokenHash));
}
