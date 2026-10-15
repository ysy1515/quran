import { describe, expect, it } from "vitest";
import { DEFAULT_MADHAB, migrateAdhanPrefs } from "./adhanPrefs";

const defaults = { madhab: DEFAULT_MADHAB, calcMethod: "UmmAlQura", enabled: false };

describe("migrateAdhanPrefs", () => {
  it("defaults to Shafi", () => {
    expect(DEFAULT_MADHAB).toBe("Shafi");
    expect(migrateAdhanPrefs({}, defaults).madhab).toBe("Shafi");
  });

  it("moves pre-v2 saved prefs from the old Hanafi default to Shafi, keeping other choices", () => {
    const out = migrateAdhanPrefs({ madhab: "Hanafi", calcMethod: "Egyptian", enabled: true }, defaults);
    expect(out).toEqual({ madhab: "Shafi", calcMethod: "Egyptian", enabled: true, prefsVersion: 2 });
  });

  it("keeps Hanafi when the user chose it after the change", () => {
    expect(migrateAdhanPrefs({ madhab: "Hanafi", prefsVersion: 2 }, defaults).madhab).toBe("Hanafi");
  });
});
