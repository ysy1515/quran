import type { Coords } from "./prayer";

// Manual location choice, for when GPS is off or refused. City-centre coordinates
// (WGS84, 4 decimals). Prayer times change by about one minute per ~25 km east–west,
// so a city centre is accurate to the minute within the city.

export interface City {
  id: string;
  name: string;
  region: string;
  coords: Coords;
}

export const SAUDI_CITIES: City[] = [
  { id: "makkah", name: "مكة المكرمة", region: "منطقة مكة المكرمة", coords: { lat: 21.4225, lng: 39.8262 } },
  { id: "madinah", name: "المدينة المنورة", region: "منطقة المدينة المنورة", coords: { lat: 24.4686, lng: 39.6142 } },
  { id: "riyadh", name: "الرياض", region: "منطقة الرياض", coords: { lat: 24.7136, lng: 46.6753 } },
  { id: "jeddah", name: "جدة", region: "منطقة مكة المكرمة", coords: { lat: 21.5433, lng: 39.1728 } },
  { id: "dammam", name: "الدمام", region: "المنطقة الشرقية", coords: { lat: 26.4207, lng: 50.0888 } },
  { id: "hofuf", name: "الأحساء (الهفوف)", region: "المنطقة الشرقية", coords: { lat: 25.3833, lng: 49.5833 } },
  { id: "taif", name: "الطائف", region: "منطقة مكة المكرمة", coords: { lat: 21.2703, lng: 40.4158 } },
  { id: "abha", name: "أبها", region: "منطقة عسير", coords: { lat: 18.2164, lng: 42.5053 } },
  { id: "khamis-mushait", name: "خميس مشيط", region: "منطقة عسير", coords: { lat: 18.3, lng: 42.7333 } },
  { id: "jazan", name: "جازان", region: "منطقة جازان", coords: { lat: 16.8892, lng: 42.5511 } },
  { id: "najran", name: "نجران", region: "منطقة نجران", coords: { lat: 17.4933, lng: 44.1277 } },
  { id: "baha", name: "الباحة", region: "منطقة الباحة", coords: { lat: 20.0129, lng: 41.4677 } },
  { id: "tabuk", name: "تبوك", region: "منطقة تبوك", coords: { lat: 28.3835, lng: 36.5662 } },
  { id: "buraydah", name: "بريدة", region: "منطقة القصيم", coords: { lat: 26.326, lng: 43.975 } },
  { id: "hail", name: "حائل", region: "منطقة حائل", coords: { lat: 27.5114, lng: 41.7208 } },
  { id: "arar", name: "عرعر", region: "منطقة الحدود الشمالية", coords: { lat: 30.9753, lng: 41.0381 } },
  { id: "sakaka", name: "سكاكا", region: "منطقة الجوف", coords: { lat: 29.9697, lng: 40.2064 } },
];
