import { describe, expect, it } from "vitest";
import webpush from "web-push";
import { readVapidConfig } from "./vapid";

// The public half of the key pair that was exposed in the repository. Public
// keys are not secret; the private key is never written into the codebase.
const LEAKED_PUBLIC = "BI4M1jbEiITWrkcA6ctNrCU09ACv6MBwEtrFqHH6yqJlkWCtqtDYgYjlkxK5VLWQ8JYTVBsNJCFNdaZE8mMHVYQ";

describe("readVapidConfig", () => {
  it("is disabled when keys are missing", () => {
    expect(readVapidConfig({})).toEqual({ ok: false, reason: "missing" });
  });

  it("refuses the exposed key pair", () => {
    const fresh = webpush.generateVAPIDKeys();
    expect(readVapidConfig({ VAPID_PUBLIC_KEY: LEAKED_PUBLIC, VAPID_PRIVATE_KEY: fresh.privateKey })).toEqual({
      ok: false,
      reason: "leaked-key",
    });
  });

  it("accepts freshly generated keys and exposes only a short public-key fingerprint", () => {
    const fresh = webpush.generateVAPIDKeys();
    const cfg = readVapidConfig({ VAPID_PUBLIC_KEY: fresh.publicKey, VAPID_PRIVATE_KEY: fresh.privateKey });
    expect(cfg.ok).toBe(true);
    if (cfg.ok) {
      expect(cfg.publicKeyFingerprint).toMatch(/^[0-9a-f]{16}$/);
      expect(cfg.publicKeyFingerprint).not.toContain(fresh.privateKey);
    }
  });
});
