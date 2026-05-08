import { pgTable, serial, text, integer, real, timestamp } from "drizzle-orm/pg-core";

export const deviceTokensTable = pgTable("device_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  platform: text("platform").notNull(),
  deviceId: text("device_id").notNull(),
  enabledPrayers: text("enabled_prayers").notNull().default('["fajr","dhuhr","asr","maghrib","isha"]'),
  muezzinId: text("muezzin_id").notNull().default("haram-ali-mulla"),
  reminderMinutes: integer("reminder_minutes").notNull().default(0),
  locationLat: real("location_lat"),
  locationLng: real("location_lng"),
  locationName: text("location_name"),
  calcMethod: text("calc_method").notNull().default("UmmAlQura"),
  madhab: text("madhab").notNull().default("Hanafi"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DeviceToken = typeof deviceTokensTable.$inferSelect;
export type InsertDeviceToken = typeof deviceTokensTable.$inferInsert;
