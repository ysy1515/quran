import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookmarksTable = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  pageNumber: integer("page_number").notNull(),
  surahNumber: integer("surah_number").notNull(),
  verseNumber: integer("verse_number").notNull(),
  surahName: text("surah_name").notNull(),
  note: text("note"),
  sessionId: text("session_id").notNull().default("default"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBookmarkSchema = createInsertSchema(bookmarksTable).omit({
  id: true,
  createdAt: true,
});

export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarksTable.$inferSelect;
