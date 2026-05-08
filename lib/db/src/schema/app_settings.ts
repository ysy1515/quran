import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appSettingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().default("default"),
  theme: text("theme").notNull().default("light"),
  fontSize: integer("font_size").notNull().default(100),
  showTafsir: boolean("show_tafsir").notNull().default(true),
  defaultTafsirId: integer("default_tafsir_id").notNull().default(169),
  notifQuran1: text("notif_quran1").notNull().default("12:00"),
  notifQuran2: text("notif_quran2").notNull().default("18:00"),
  notifDhikr: text("notif_dhikr").notNull().default("21:00"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAppSettingsSchema = createInsertSchema(
  appSettingsTable
).omit({ id: true, updatedAt: true });

export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type AppSettings = typeof appSettingsTable.$inferSelect;
