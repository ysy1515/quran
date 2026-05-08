import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  sessionId: text("session_id").notNull().default("default"),
  notifyQuran: boolean("notify_quran").notNull().default(true),
  notifyDhikr: boolean("notify_dhikr").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptionsTable.$inferSelect;
