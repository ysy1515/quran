import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const readingProgressTable = pgTable("reading_progress", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().default("default"),
  lastPageNumber: integer("last_page_number").notNull().default(1),
  lastSurahNumber: integer("last_surah_number").notNull().default(1),
  lastVerseNumber: integer("last_verse_number").notNull().default(1),
  lastSurahName: text("last_surah_name").notNull().default("الفاتحة"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertReadingProgressSchema = createInsertSchema(
  readingProgressTable
).omit({ id: true, updatedAt: true });

export type InsertReadingProgress = z.infer<typeof insertReadingProgressSchema>;
export type ReadingProgress = typeof readingProgressTable.$inferSelect;
