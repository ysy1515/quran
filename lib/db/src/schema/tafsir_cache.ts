import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const tafsirCacheTable = pgTable("tafsir_cache", {
  id: serial("id").primaryKey(),
  surahNumber: integer("surah_number").notNull(),
  verseNumber: integer("verse_number").notNull(),
  tafsirId: integer("tafsir_id").notNull().default(169),
  tafsirText: text("tafsir_text").notNull(),
  tafsirName: text("tafsir_name").notNull(),
  cachedAt: timestamp("cached_at").defaultNow().notNull(),
});

export type TafsirCache = typeof tafsirCacheTable.$inferSelect;
