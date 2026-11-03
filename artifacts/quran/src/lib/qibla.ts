import { Coordinates, Qibla } from "adhan";
import { registerPlugin } from "@capacitor/core";
import type { Coords } from "./prayer";

export function qiblaBearing(c: Coords): number {
  return Qibla(new Coordinates(c.lat, c.lng));
}
/** Distance helps suppress an unstable bearing when location uncertainty spans the Kaaba. */
export function distanceToKaaba(c: Coords): number {
  const rad = Math.PI / 180;
  const a = Math.sin((21.4225241 - c.lat) * rad / 2) ** 2
    + Math.cos(c.lat * rad) * Math.cos(21.4225241 * rad) * Math.sin((39.8261818 - c.lng) * rad / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}
export function relativeBearing(bearing: number, heading: number): number {
  return ((bearing - heading + 540) % 360) - 180;
}
export interface CompassReading {
  valid: boolean;
  heading?: number;
  accuracy?: number;
  lat?: number;
  lng?: number;
  locationAccuracy?: number;
}
export const QiblaCompass = registerPlugin<{
  start(): Promise<void>;
  read(): Promise<CompassReading>;
  stop(): Promise<void>;
}>("QiblaCompass");
