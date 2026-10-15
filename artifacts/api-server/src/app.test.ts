import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("./lib/pushStore", () => ({
  upsertSubscription: vi.fn(async () => {}),
  deleteSubscription: vi.fn(async () => {}),
  updateSubscription: vi.fn(async () => true),
  listSubscriptions: vi.fn(async () => []),
}));

const store = await import("./lib/pushStore");
const { default: app } = await import("./app");

const ENDPOINT = "https://fcm.googleapis.com/fcm/send/abc123";

beforeEach(() => vi.clearAllMocks());

describe("shared personal-data endpoints are gone", () => {
  it.each([
    ["get", "/api/bookmarks"],
    ["post", "/api/bookmarks"],
    ["delete", "/api/bookmarks/1"],
    ["get", "/api/reading-progress"],
    ["put", "/api/reading-progress"],
    ["get", "/api/settings"],
    ["put", "/api/settings"],
    ["get", "/api/stats"],
    ["get", "/api/push/times"],
    ["post", "/api/notifications/register-device"],
    ["post", "/api/notifications/update-preferences"],
    ["delete", "/api/notifications/unregister-device"],
  ] as const)("%s %s returns 404", async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.status).toBe(404);
  });
});

describe("push routes only touch the caller's own subscription", () => {
  it("rejects time changes without an endpoint", async () => {
    const res = await request(app).put("/api/push/times").send({ notifQuran1: "05:00" });
    expect(res.status).toBe(400);
    expect(store.updateSubscription).not.toHaveBeenCalled();
  });

  it("rejects malformed times", async () => {
    const res = await request(app).put("/api/push/times").send({ endpoint: ENDPOINT, notifQuran1: "25:00" });
    expect(res.status).toBe(400);
  });

  it("updates only the given subscription", async () => {
    const res = await request(app)
      .put("/api/push/times")
      .send({ endpoint: ENDPOINT, notifQuran1: "05:30" });
    expect(res.status).toBe(200);
    expect(store.updateSubscription).toHaveBeenCalledWith(ENDPOINT, { notifQuran1: "05:30" });
  });

  it("returns 404 for an unknown subscription", async () => {
    vi.mocked(store.updateSubscription).mockResolvedValueOnce(false);
    const res = await request(app).put("/api/push/preferences").send({ endpoint: ENDPOINT, notifyQuran: false });
    expect(res.status).toBe(404);
  });

  it("rejects non-https endpoints on subscribe", async () => {
    const res = await request(app)
      .post("/api/push/subscribe")
      .send({ endpoint: "http://evil.example/x", keys: { p256dh: "a", auth: "b" } });
    expect(res.status).toBe(400);
    expect(store.upsertSubscription).not.toHaveBeenCalled();
  });

  it("stores a valid subscription", async () => {
    const res = await request(app)
      .post("/api/push/subscribe")
      .send({ endpoint: ENDPOINT, keys: { p256dh: "p", auth: "a" }, notifyDhikr: false });
    expect(res.status).toBe(200);
    expect(store.upsertSubscription).toHaveBeenCalledWith({
      endpoint: ENDPOINT,
      p256dh: "p",
      auth: "a",
      notifyQuran: true,
      notifyDhikr: false,
    });
  });

  it("reports push as unconfigured when VAPID secrets are missing", async () => {
    const res = await request(app).get("/api/push/vapid-public-key");
    expect(res.status).toBe(503);
  });

  it("rate-limits repeated writes", async () => {
    let last = 0;
    for (let i = 0; i < 35; i++) {
      last = (await request(app).delete("/api/push/unsubscribe").send({ endpoint: ENDPOINT })).status;
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
