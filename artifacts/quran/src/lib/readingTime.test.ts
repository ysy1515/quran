import { beforeEach, describe, expect, it } from "vitest";
import { addReadingSeconds, createReadingTracker, readingTimeStore } from "./readingTime";

function setup(visible = true) {
  let t = 1_000_000;
  const added: number[] = [];
  const tracker = createReadingTracker({ now: () => t, add: (s) => added.push(s), visible });
  return {
    tracker,
    added,
    advance: (sec: number) => (t += sec * 1000),
    total: () => added.reduce((a, b) => a + b, 0),
  };
}

describe("reading time tracker", () => {
  it("records the final visible interval when the app goes to the background", () => {
    const r = setup();
    r.advance(12);
    r.tracker.hide();
    expect(r.total()).toBe(12);
  });

  it("does not count background time, and resumes counting when visible", () => {
    const r = setup();
    r.advance(10);
    r.tracker.hide();
    r.advance(3600); // in the background for an hour
    r.tracker.tick(); // a stray timer while hidden adds nothing
    r.tracker.show();
    r.advance(5);
    r.tracker.hide();
    expect(r.total()).toBe(15);
  });

  it("records periodic ticks without double counting", () => {
    const r = setup();
    r.advance(30);
    r.tracker.tick();
    r.advance(30);
    r.tracker.tick();
    r.advance(7);
    r.tracker.stop();
    expect(r.added).toEqual([30, 30, 7]);
  });

  it("records the last stretch on unmount and ignores events after it", () => {
    const r = setup();
    r.advance(8);
    r.tracker.stop();
    r.tracker.show();
    r.advance(100);
    r.tracker.hide();
    r.tracker.stop();
    expect(r.total()).toBe(8);
  });

  it("unmount while hidden adds nothing more", () => {
    const r = setup();
    r.advance(4);
    r.tracker.hide();
    r.advance(50);
    r.tracker.stop();
    expect(r.total()).toBe(4);
  });

  it("starts paused when the screen opens hidden", () => {
    const r = setup(false);
    r.advance(20);
    r.tracker.tick();
    r.tracker.show();
    r.advance(6);
    r.tracker.stop();
    expect(r.total()).toBe(6);
  });

  it("repeated hide or show events are harmless", () => {
    const r = setup();
    r.advance(5);
    r.tracker.hide();
    r.tracker.hide();
    r.tracker.show();
    r.advance(2);
    r.tracker.show(); // must not restart the stretch
    r.advance(3);
    r.tracker.hide();
    expect(r.total()).toBe(10);
  });
});

describe("reading time store", () => {
  beforeEach(() => readingTimeStore.reset());

  it("accumulates whole seconds and keeps the first start date", () => {
    addReadingSeconds(12.7, new Date("2026-10-01T00:00:00Z"));
    addReadingSeconds(3, new Date("2026-10-02T00:00:00Z"));
    expect(readingTimeStore.get()).toEqual({ seconds: 15, since: "2026-10-01T00:00:00.000Z" });
  });

  it("caps a single flush at five minutes", () => {
    addReadingSeconds(10_000);
    expect(readingTimeStore.get()?.seconds).toBe(300);
  });
});
