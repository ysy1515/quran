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
 * A JSON value persisted in localStorage on this device only. Stored data is run
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
      const raw = storage?.getItem(key);
      if (raw != null) value = validate(JSON.parse(raw)) ?? fallback;
    } catch {
      value = fallback;
    }
    cache = { value };
    return value;
  }

  function write(value: T) {
    cache = { value };
    try {
      storage?.setItem(key, JSON.stringify(value));
    } catch {
      // Quota or disabled storage: keep the in-memory value for this session.
    }
    listeners.forEach((l) => l());
  }

  return {
    get: read,
    set: write,
    update: (fn) => write(fn(read())),
    reset() {
      cache = null;
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
