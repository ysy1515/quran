import { afterEach, expect, it, vi } from "vitest";
import { coordsStore, requestLocation } from "./prayer";
afterEach(() => vi.unstubAllGlobals());
it("requests a fresh high accuracy fix and saves it immediately", async () => {
  const getCurrentPosition = vi.fn((success) => success({ coords: { latitude: 18.3, longitude: 42.7333, accuracy: 15 } }));
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  await expect(requestLocation()).resolves.toEqual({ lat: 18.3, lng: 42.7333 });
  expect(getCurrentPosition.mock.calls[0]![2]).toEqual({ enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  expect(coordsStore.get()).toEqual({ lat: 18.3, lng: 42.7333 });
});
it("rejects an approximate fix without replacing the saved location", async () => {
  const previous = coordsStore.get();
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: (success: (p: unknown) => void) => success({ coords: { latitude: 24, longitude: 46, accuracy: 5000 } }) } });
  await expect(requestLocation()).rejects.toThrow("inaccurate-location");
  expect(coordsStore.get()).toEqual(previous);
});
