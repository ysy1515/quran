import { describe, expect, it } from "vitest";
import { REMINDER_TEXT } from "./reminders";
import { notificationRoute } from "./notificationRoute";

describe("notification tap navigation", () => {
  it("opens the screen of every daily reminder", () => {
    for (const r of Object.values(REMINDER_TEXT)) expect(notificationRoute({ route: r.route })).toBe(r.route);
  });

  it("opens prayer times for a prayer notification", () => {
    expect(notificationRoute({ route: "/adhan", prayer: "fajr", day: "0" })).toBe("/adhan");
  });

  it("ignores missing, foreign or malformed routes", () => {
    expect(notificationRoute(undefined)).toBeNull();
    expect(notificationRoute({ prayer: "fajr" })).toBeNull();
    expect(notificationRoute({ route: "https://example.com" })).toBeNull();
    expect(notificationRoute({ route: "//example.com" })).toBeNull();
    expect(notificationRoute({ route: "/settings/../../x" })).toBeNull();
  });
});
