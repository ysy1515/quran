import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptionsTable.$inferSelect;
