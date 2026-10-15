import { pgTable, serial, text, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  sessionId: text("session_id").notNull().default("default"),
  notifyQuran: boolean("notify_quran").notNull().default(true),
  notifyDhikr: boolean("notify_dhikr").notNull().default(true),
  // Reminder times for this subscriber, "HH:MM" in Saudi time (UTC+3).
  notifQuran1: text("notif_quran1").notNull().default("12:00"),
  notifQuran2: text("notif_quran2").notNull().default("18:00"),
  notifDhikr: text("notif_dhikr").notNull().default("21:00"),
  // SHA-256 of the secret management token returned once to the subscribing
  // browser. Every later change or deletion must present that token. Rows from
  // before tokens existed have NULL here and can't be changed or sent to.
  // A plain index, not a unique constraint: adding a unique constraint to a table
  // with rows makes `drizzle-kit push` stop at an interactive prompt, which would
  // hang Replit's post-merge step. Tokens are 256-bit random values.
  manageTokenHash: text("manage_token_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("push_subscriptions_manage_token_hash_idx").on(t.manageTokenHash)]);

export type PushSubscription = typeof pushSubscriptionsTable.$inferSelect;
