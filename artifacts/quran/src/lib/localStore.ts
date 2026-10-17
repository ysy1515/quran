import { useSyncExternalStore } from "react";

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // storage disabled (private mode, policies)
  }
}

export interface LocalStore<T> {
  get(): T;
  set(value: T): void;
  update(fn: (prev: T) => T): void;
  reset(): void;
  subscribe(listener: () => void): () => void;
}

/**
 * Native key-value storage that the OS does not evict (Capacitor Preferences:
 * UserDefaults on iOS). The WebView's localStorage can be reclaimed under storage
 * pressure, so on native the durable copy is the one read at startup.
 */
export interface DurableBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

interface Registered {
  validate: (raw: unknown) => unknown;
  storage: StorageLike | null;
  invalidate(): void;
}

const registry = new Map<string, Registered>();
/** Values loaded from the durable backend at startup; read before localStorage. */
const durableValues = new Map<string, string>();
/** Keys written since startup, so a late hydration never replaces newer data. */
const writtenSinceStart = new Set<string>();
let backend: DurableBackend | null = null;
let writeChain: Promise<unknown> = Promise.resolve();

function persistDurable(key: string, json: string) {
  if (!backend) return;
  durableValues.set(key, json);
  const b = backend;
  // Serialise writes so they land in the order they were made.
  writeChain = writeChain.then(() => b.set(key, json)).catch(() => undefined);
}

/** Resolves once every queued durable write has been handed to the backend. */
export function durableWritesSettled(): Promise<unknown> {
  return writeChain;
}

/**
 * A JSON value persisted on this device only. Reads come from the durable native
 * copy when one was loaded at startup, otherwise from localStorage. Writes go to
 * localStorage and, on native, to the durable backend as well. Stored data is run
 * through `validate` on read; anything malformed falls back to `fallback`.
 */
export function createLocalStore<T>(
  key: string,
  fallback: T,
  validate: (raw: unknown) => T | null,
  storage: StorageLike | null = defaultStorage(),
): LocalStore<T> {
  const listeners = new Set<() => void>();
  let cache: { value: T } | null = null;

  function read(): T {
    if (cache) return cache.value;
    let value = fallback;
    try {
      const raw = durableValues.has(key) ? durableValues.get(key)! : storage?.getItem(key);
      if (raw != null) value = validate(JSON.parse(raw)) ?? fallback;
    } catch {
      value = fallback;
    }
    cache = { value };
    return value;
  }

  function write(value: T) {
    cache = { value };
    writtenSinceStart.add(key);
    const json = JSON.stringify(value);
    try {
      storage?.setItem(key, json);
    } catch {
      // Quota or disabled storage: the durable copy below still gets it.
    }
    persistDurable(key, json);
    listeners.forEach((l) => l());
  }

  registry.set(key, {
    validate,
    storage,
    invalidate() {
      cache = null;
      listeners.forEach((l) => l());
    },
  });

  return {
    get: read,
    set: write,
    update: (fn) => write(fn(read())),
    reset() {
      // Test and "start over" helper: clears this device's copy for the key.
      cache = null;
      durableValues.delete(key);
      try {
        storage?.removeItem(key);
      } catch {
        // ignore
      }
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

// ── Durable storage and the one-time copy from localStorage ─────────────────

export const MIGRATION_MARKER = "quran.migrated.v1";

export interface MigrationReport {
  /** Keys copied from localStorage into durable storage on this run. */
  copied: string[];
  /** Keys whose durable copy was used. */
  restored: string[];
  /** Keys that failed to read or write; their localStorage copy stays in use. */
  failed: string[];
}

function usable(entry: Registered, raw: string | null): boolean {
  if (raw == null) return false;
  try {
    return entry.validate(JSON.parse(raw)) != null;
  } catch {
    return false;
  }
}

/**
 * Connects the durable backend and copies existing data into it. For each
 * registered key:
 * - durable copy present and valid: use it; localStorage is left untouched;
 * - otherwise, a valid localStorage value is copied into durable storage unchanged;
 * - nothing is ever deleted, and an existing durable value is never overwritten
 *   here, so running this again is a no-op.
 * Keys written by the app while this runs keep the newer in-memory value.
 */
export async function connectDurableStorage(
  b: DurableBackend,
  keys: readonly string[] = [...registry.keys()],
  now = new Date(),
): Promise<MigrationReport> {
  backend = b;
  const report: MigrationReport = { copied: [], restored: [], failed: [] };
  await Promise.all(
    keys.map(async (key) => {
      const entry = registry.get(key);
      if (!entry) return;
      try {
        const durable = await b.get(key);
        if (writtenSinceStart.has(key)) return; // already written through to the backend
        if (usable(entry, durable)) {
          durableValues.set(key, durable!);
          report.restored.push(key);
          entry.invalidate();
          return;
        }
        let local: string | null = null;
        try {
          local = entry.storage?.getItem(key) ?? null;
        } catch {
          local = null;
        }
        if (usable(entry, local) && durable == null) {
          await b.set(key, local!);
          durableValues.set(key, local!);
          report.copied.push(key);
        }
      } catch {
        report.failed.push(key);
      }
    }),
  );
  if (!report.failed.length) {
    try {
      if ((await b.get(MIGRATION_MARKER)) == null) await b.set(MIGRATION_MARKER, JSON.stringify(now.toISOString()));
    } catch {
      // The marker is informational only.
    }
  }
  return report;
}

/** Keys of every store created so far. */
export function registeredKeys(): string[] {
  return [...registry.keys()];
}

/** Test helper: forget the backend and loaded durable values. */
export function disconnectDurableStorageForTests() {
  backend = null;
  durableValues.clear();
  writtenSinceStart.clear();
  writeChain = Promise.resolve();
  registry.forEach((r) => r.invalidate());
}
