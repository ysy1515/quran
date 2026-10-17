import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MIGRATION_MARKER,
  connectDurableStorage,
  createLocalStore,
  disconnectDurableStorageForTests,
  durableWritesSettled,
  registeredKeys,
  type DurableBackend,
} from "./localStore";

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

class MemoryBackend implements DurableBackend {
  data = new Map<string, string>();
  sets: string[] = [];
  failGet = new Set<string>();
  async get(k: string) {
    if (this.failGet.has(k)) throw new Error("boom");
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  async set(k: string, v: string) {
    this.sets.push(k);
    this.data.set(k, v);
  }
}

type List = { id: number }[];
const listOf = (raw: unknown): List | null =>
  Array.isArray(raw) && raw.every((x) => typeof x === "object" && x && typeof (x as { id: unknown }).id === "number")
    ? (raw as List)
    : null;

let seq = 0;
function makeStore(local: MemoryStorage) {
  const key = `test.list.${++seq}`;
  return { key, store: createLocalStore<List>(key, [], listOf, local) };
}

describe("migration from localStorage to native storage", () => {
  let local: MemoryStorage;
  let native: MemoryBackend;
  beforeEach(() => {
    disconnectDurableStorageForTests();
    local = new MemoryStorage();
    native = new MemoryBackend();
  });

  it("copies existing localStorage data across unchanged and keeps the original", async () => {
    const { key, store } = makeStore(local);
    const saved = JSON.stringify([{ id: 1 }, { id: 2 }]);
    local.setItem(key, saved);
    const report = await connectDurableStorage(native, [key]);
    expect(report.copied).toEqual([key]);
    expect(native.data.get(key)).toBe(saved);
    expect(local.getItem(key)).toBe(saved); // never deleted
    expect(store.get()).toEqual([{ id: 1 }, { id: 2 }]);
    expect(native.data.has(MIGRATION_MARKER)).toBe(true);
  });

  it("is idempotent: a second run changes nothing", async () => {
    const { key } = makeStore(local);
    local.setItem(key, JSON.stringify([{ id: 1 }]));
    await connectDurableStorage(native, [key]);
    const setsAfterFirst = native.sets.length;
    const snapshot = new Map(native.data);
    const again = await connectDurableStorage(native, [key]);
    expect(again.copied).toEqual([]);
    expect(native.sets.length).toBe(setsAfterFirst);
    expect(native.data).toEqual(snapshot);
  });

  it("never overwrites data already in native storage", async () => {
    const { key, store } = makeStore(local);
    native.data.set(key, JSON.stringify([{ id: 9 }]));
    local.setItem(key, JSON.stringify([{ id: 1 }]));
    const report = await connectDurableStorage(native, [key]);
    expect(report.restored).toEqual([key]);
    expect(native.sets).not.toContain(key);
    expect(native.data.get(key)).toBe(JSON.stringify([{ id: 9 }]));
    expect(local.getItem(key)).toBe(JSON.stringify([{ id: 1 }])); // left as it was
    expect(store.get()).toEqual([{ id: 9 }]);
  });

  it("ignores a corrupt localStorage value and leaves it in place", async () => {
    const { key, store } = makeStore(local);
    local.setItem(key, "{not json");
    const report = await connectDurableStorage(native, [key]);
    expect(report.copied).toEqual([]);
    expect(native.data.has(key)).toBe(false);
    expect(local.getItem(key)).toBe("{not json");
    expect(store.get()).toEqual([]);
  });

  it("keeps using a valid localStorage value when the native copy is corrupt, without overwriting it", async () => {
    const { key, store } = makeStore(local);
    native.data.set(key, '"garbage"');
    local.setItem(key, JSON.stringify([{ id: 3 }]));
    await connectDurableStorage(native, [key]);
    expect(native.data.get(key)).toBe('"garbage"');
    expect(store.get()).toEqual([{ id: 3 }]);
  });

  it("falls back to localStorage for a key whose native read fails, and skips the marker", async () => {
    const { key, store } = makeStore(local);
    local.setItem(key, JSON.stringify([{ id: 4 }]));
    native.failGet.add(key);
    const report = await connectDurableStorage(native, [key]);
    expect(report.failed).toEqual([key]);
    expect(store.get()).toEqual([{ id: 4 }]);
    expect(native.data.has(MIGRATION_MARKER)).toBe(false);
  });

  it("restores from native storage after the WebView's localStorage was cleared", async () => {
    const { key, store } = makeStore(local);
    native.data.set(key, JSON.stringify([{ id: 5 }]));
    // localStorage is empty, as after iOS reclaims WebView storage
    await connectDurableStorage(native, [key]);
    expect(store.get()).toEqual([{ id: 5 }]);
  });

  it("writes every change to both stores, in order", async () => {
    const { key, store } = makeStore(local);
    await connectDurableStorage(native, [key]);
    store.set([{ id: 1 }]);
    store.update((l) => [...l, { id: 2 }]);
    await durableWritesSettled();
    expect(native.data.get(key)).toBe(JSON.stringify([{ id: 1 }, { id: 2 }]));
    expect(local.getItem(key)).toBe(JSON.stringify([{ id: 1 }, { id: 2 }]));
  });

  it("does not replace a change made while the migration was running", async () => {
    const { key, store } = makeStore(local);
    native.data.set(key, JSON.stringify([{ id: 1 }]));
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slow: DurableBackend = {
      get: (k) => gate.then(() => native.data.get(k) ?? null),
      set: (k, v) => native.set(k, v),
    };
    const running = connectDurableStorage(slow, [key]);
    store.set([{ id: 2 }]); // user acts before the native read returns
    release();
    await running;
    await durableWritesSettled();
    expect(store.get()).toEqual([{ id: 2 }]);
    expect(native.data.get(key)).toBe(JSON.stringify([{ id: 2 }]));
  });
});

describe("app stores", () => {
  afterEach(() => disconnectDurableStorageForTests());

  it("registers every durable key with a validator", async () => {
    const { DURABLE_KEYS } = await import("./persistence");
    const keys = registeredKeys();
    for (const k of DURABLE_KEYS) expect(keys).toContain(k);
  });

  it("keeps khatmah, bookmarks, favourites and tasbeeh across an app restart with localStorage cleared", async () => {
    const native = new MemoryBackend();
    const NOW = new Date("2026-10-17T08:00:00Z");

    // First launch: user data is created.
    {
      vi.resetModules();
      const ls = await import("./localStore");
      const k = await import("./khatmah");
      const b = await import("./bookmarks");
      const d = await import("./dhikr");
      await import("./persistence");
      await ls.connectDurableStorage(native);
      k.startKhatmah(k.createPlan({ unit: "rub", size: 8, startJuz: 1 }, NOW));
      k.completeCurrentPortion(NOW);
      b.toggleBookmark({ surahNumber: 2, verseNumber: 255, pageNumber: 42, surahName: "البقرة" });
      b.toggleFavorite({ surahNumber: 1, verseNumber: 1, pageNumber: 1, surahName: "الفاتحة", text: "placeholder" });
      d.tapDhikr();
      d.tapDhikr();
      await ls.durableWritesSettled();
    }

    // Second launch: fresh modules, no localStorage at all (node has none).
    {
      vi.resetModules();
      const ls = await import("./localStore");
      const k = await import("./khatmah");
      const b = await import("./bookmarks");
      const d = await import("./dhikr");
      const { DURABLE_KEYS } = await import("./persistence");
      const report = await ls.connectDurableStorage(native, DURABLE_KEYS);
      expect(report.restored).toEqual(expect.arrayContaining(["quran.khatmah.v1", "quran.bookmarks.v1", "dhikr-state"]));
      expect(k.summarize(k.khatmahStore.get()).completed).toBe(1);
      expect(b.bookmarksStore.get().map((x) => x.verseNumber)).toEqual([255]);
      expect(b.favoritesStore.get().map((x) => x.verseNumber)).toEqual([1]);
      expect(d.dhikrStore.get().count).toBe(2);
    }
  });
});
