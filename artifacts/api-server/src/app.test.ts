import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import webpush from "web-push";

// Fresh throwaway keys for the test run only.
const keys = webpush.generateVAPIDKeys();
process.env.VAPID_PUBLIC_KEY = keys.publicKey;
process.env.VAPID_PRIVATE_KEY = keys.privateKey;

vi.mock("./lib/pushStore", () => ({
  insertSubscription: vi.fn(async () => true),
  updateSubscriptionByToken: vi.fn(async () => true),
  deleteSubscriptionByToken: vi.fn(async () => true),
  deleteSubscriptionById: vi.fn(async () => {}),
  listSubscriptions: vi.fn(async () => []),
}));

const store = await import("./lib/pushStore");
const { hashToken } = await import("./routes/push");
const { default: app } = await import("./app");

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc123";
const SUB = { endpoint: ENDPOINT, keys: { p256dh: "p", auth: "a" } };
const TOKEN = "A".repeat(43);

beforeEach(() => vi.clearAllMocks());

describe("legacy shared-data endpoints", () => {
  it.each([
    ["get", "/api/push/times"],
    ["post", "/api/notifications/register-device"],
    ["post", "/api/notifications/update-preferences"],
    ["delete", "/api/notifications/unregister-device"],
  ] as const)("%s %s returns 404", async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(404);
  });
});

describe("push subscription ownership", () => {
  it("returns a management token once and stores only its hash", async () => {
    const res = await request(app).post("/api/push/subscribe").send({ ...SUB, notifyDhikr: false });
    expect(res.status).toBe(201);
    const token = res.body.manageToken as string;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(store.insertSubscription).toHaveBeenCalledWith({
      endpoint: ENDPOINT,
      p256dh: "p",
      auth: "a",
      notifyQuran: true,
      notifyDhikr: false,
      manageTokenHash: hashToken(token),
    });
    const stored = vi.mocked(store.insertSubscription).mock.calls[0]![0];
    expect(JSON.stringify(stored)).not.toContain(token);
  });

  it("issues a different token for every subscription", async () => {
    const a = await request(app).post("/api/push/subscribe").send(SUB);
    const b = await request(app).post("/api/push/subscribe").send({ ...SUB, endpoint: ENDPOINT + "x" });
    expect(a.body.manageToken).not.toBe(b.body.manageToken);
  });

  it("refuses to re-register an existing endpoint (no overwrite by endpoint)", async () => {
    vi.mocked(store.insertSubscription).mockResolvedValueOnce(false);
    const res = await request(app).post("/api/push/subscribe").send(SUB);
    expect(res.status).toBe(409);
    expect(res.body.manageToken).toBeUndefined();
  });

  it.each([
    ["put", "/api/push/times", { endpoint: ENDPOINT, notifQuran1: "05:00" }],
    ["put", "/api/push/preferences", { endpoint: ENDPOINT, notifyQuran: false }],
    ["delete", "/api/push/unsubscribe", { endpoint: ENDPOINT }],
  ] as const)("%s %s with only the endpoint is refused and touches nothing", async (method, path, body) => {
    const res = await request(app)[method](path).send(body);
    expect(res.status).toBe(404);
    expect(store.updateSubscriptionByToken).not.toHaveBeenCalled();
    expect(store.deleteSubscriptionByToken).not.toHaveBeenCalled();
  });

  it("refuses a malformed bearer token without a lookup", async () => {
    const res = await request(app)
      .put("/api/push/times")
      .set("Authorization", "Bearer short")
      .send({ notifQuran1: "05:00" });
    expect(res.status).toBe(404);
    expect(store.updateSubscriptionByToken).not.toHaveBeenCalled();
  });

  it("refuses a well-formed but unknown token with the same response", async () => {
    vi.mocked(store.updateSubscriptionByToken).mockResolvedValueOnce(false);
    const res = await request(app)
      .put("/api/push/times")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ notifQuran1: "05:00" });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Subscription not found" });
  });

  it("updates times only through the token's hash, ignoring any endpoint in the body", async () => {
    const res = await request(app)
      .put("/api/push/times")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ endpoint: "https://someone-else.example/x", notifQuran1: "05:30" });
    expect(res.status).toBe(200);
    expect(store.updateSubscriptionByToken).toHaveBeenCalledWith(hashToken(TOKEN), { notifQuran1: "05:30" });
  });

  it("deletes only with the token", async () => {
    const res = await request(app).delete("/api/push/unsubscribe").set("Authorization", `Bearer ${TOKEN}`);
    expect(res.status).toBe(200);
    expect(store.deleteSubscriptionByToken).toHaveBeenCalledWith(hashToken(TOKEN));
  });

  it("rejects malformed times", async () => {
    const res = await request(app)
      .put("/api/push/times")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ notifQuran1: "25:00" });
    expect(res.status).toBe(400);
  });

  it("rejects non-https endpoints on subscribe", async () => {
    const res = await request(app)
      .post("/api/push/subscribe")
      .send({ endpoint: "http://evil.example/x", keys: { p256dh: "a", auth: "b" } });
    expect(res.status).toBe(400);
    expect(store.insertSubscription).not.toHaveBeenCalled();
  });

  it("serves the configured public key", async () => {
    const res = await request(app).get("/api/push/vapid-public-key");
    expect(res.status).toBe(200);
    expect(res.body.publicKey).toBe(keys.publicKey);
  });

  it("rate-limits repeated writes", async () => {
    let last = 0;
    for (let i = 0; i < 35; i++) {
      last = (await request(app).delete("/api/push/unsubscribe").set("Authorization", `Bearer ${TOKEN}`)).status;
    }
    expect(last).toBe(429);
  });
});

describe("HTTP hardening", () => {
  it("sends CORS headers only to allowed origins", async () => {
    const ok = await request(app).get("/api/healthz").set("Origin", "capacitor://localhost");
    expect(ok.headers["access-control-allow-origin"]).toBe("capacitor://localhost");
    const bad = await request(app).get("/api/healthz").set("Origin", "https://evil.example");
    expect(bad.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("sets security headers and hides the framework", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("rejects oversized JSON bodies", async () => {
    const res = await request(app)
      .post("/api/push/subscribe")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ endpoint: ENDPOINT, pad: "x".repeat(20_000) }));
    expect(res.status).toBe(413);
  });
});

describe("tafsir input validation", () => {
  it("rejects an ayah that does not exist", async () => {
    const res = await request(app).get("/api/verses/2/287/tafsir");
    expect(res.status).toBe(400);
  });
  it("rejects unsupported tafsir editions", async () => {
    const res = await request(app).get("/api/verses/1/1/tafsir?tafsirId=999");
    expect(res.status).toBe(400);
  });
});
