import { expect, it } from "vitest";
import { distanceToKaaba, qiblaBearing, relativeBearing } from "./qibla";
it("points south from north of the Kaaba and north from south of it", () => {
  expect(qiblaBearing({ lat: 30, lng: 39.8261818 })).toBeCloseTo(180, 3);
  const north = qiblaBearing({ lat: 10, lng: 39.8261818 });
  expect(Math.min(north, 360 - north)).toBeLessThan(0.001);
});
it("uses the shortest turn across north and correctly distinguishes left from right", () => {
  expect(relativeBearing(1, 359)).toBe(2);
  expect(relativeBearing(359, 1)).toBe(-2);
  expect(relativeBearing(90, 0)).toBe(90);
  expect(relativeBearing(270, 0)).toBe(-90);
  expect(relativeBearing(243, 243)).toBe(0);
});

it("detects proximity to the Kaaba where a GPS compass bearing is unreliable", () => {
  expect(distanceToKaaba({ lat: 21.4225241, lng: 39.8261818 })).toBe(0);
  expect(distanceToKaaba({ lat: 22.4225241, lng: 39.8261818 })).toBeCloseTo(111194.93, 1);
});
