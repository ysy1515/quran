import { describe, expect, it, vi } from "vitest";
import request from "supertest";

const dbCalls: string[] = [];
vi.mock("@workspace/db", () => {
  const record = (name: string) => () => {
    dbCalls.push(name);
    throw new Error("legacy routes must not touch the database");
  };
  return {
    db: { select: record("select"), insert: record("insert"), update: record("update"), delete: record("delete") },
    tafsirCacheTable: {},
    pushSubscriptionsTable: {},
  };
});

const { default: app } = await import("../app");

describe("compatibility routes for pre-Phase-1 app builds", () => {
  it("serve fixed, empty defaults so old screens still render", async () => {
    expect((await request(app).get("/api/bookmarks")).body).toEqual([]);
    expect((await request(app).get("/api/reading-progress")).body).toMatchObject({ lastPageNumber: 1, lastSurahNumber: 1 });
    expect((await request(app).get("/api/settings")).body).toMatchObject({ fontSize: 100, showTafsir: true });
    expect((await request(app).get("/api/stats")).body).toMatchObject({ totalBookmarks: 0, pagesRead: 0 });
  });

  it.each([
    ["post", "/api/bookmarks"],
    ["delete", "/api/bookmarks/1"],
    ["put", "/api/reading-progress"],
    ["put", "/api/settings"],
  ] as const)("%s %s is refused with 410 and stores nothing", async (method, path) => {
    const res = await request(app)[method](path).send({ surahNumber: 2, verseNumber: 255 });
    expect(res.status).toBe(410);
  });

  it("never touched the database", () => {
    expect(dbCalls).toEqual([]);
  });
});
