import { vi } from "vitest";

// The real @workspace/db opens a Postgres pool at import time. Tests never touch
// the database: push storage is mocked per test file and the tafsir cache is stubbed.
vi.mock("@workspace/db", () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "from", "where", "limit"]) chain[m] = () => chain;
  (chain as { then: unknown }).then = (resolve: (v: unknown[]) => void) => resolve([]);
  return {
    db: {
      select: () => chain,
      insert: () => ({ values: () => Promise.resolve() }),
    },
    tafsirCacheTable: {},
    pushSubscriptionsTable: {},
  };
});

process.env.LOG_LEVEL = "silent";
