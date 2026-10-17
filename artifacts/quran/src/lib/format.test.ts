import { describe, expect, it } from "vitest";
import { ar, awradLabel, ayatLabel, clock, durationLabel, juzLabel } from "./format";

describe("format", () => {
  it("writes Arabic-Indic digits", () => expect(ar(1448)).toBe("١٤٤٨"));
  it("agrees the ayah count", () => {
    expect([1, 2, 7, 11, 103, 286].map(ayatLabel)).toEqual(["آية واحدة", "آيتان", "٧ آيات", "١١ آية", "١٠٣ آيات", "٢٨٦ آية"]);
  });
  it("agrees the portion count", () => {
    expect([1, 2, 7, 30, 100, 120, 240].map(awradLabel)).toEqual(["ورد واحد", "وردان", "٧ أوراد", "٣٠ وردًا", "١٠٠ ورد", "١٢٠ وردًا", "٢٤٠ وردًا"]);
  });
  it("names the juz", () => {
    expect(juzLabel(1)).toBe("الجزء الأول");
    expect(juzLabel(30)).toBe("الجزء الثلاثون");
  });
  it("splits a 12-hour clock with an Arabic period", () => {
    expect(clock(new Date(2026, 9, 17, 14, 57))).toEqual({ time: "02:57", period: "م" });
    expect(clock(new Date(2026, 9, 17, 4, 34))).toEqual({ time: "04:34", period: "ص" });
  });
  it("describes time spent reading", () => {
    expect(durationLabel(30)).toBe("أقل من دقيقة");
    expect(durationLabel(7 * 3600 + 25 * 60)).toBe("٧ ساعات و٢٥ دقيقة");
    expect(durationLabel(3600 + 120)).toBe("ساعة واحدة ودقيقتان");
  });
});
