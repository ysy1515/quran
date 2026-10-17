const ARABIC_INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** 604 → "٦٠٤". Used for Quran references (surah, ayah, page, juz) and counts. */
export function ar(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)]!);
}

const ORDINAL_JUZ = [
  "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر",
  "الحادي عشر", "الثاني عشر", "الثالث عشر", "الرابع عشر", "الخامس عشر", "السادس عشر", "السابع عشر",
  "الثامن عشر", "التاسع عشر", "العشرون", "الحادي والعشرون", "الثاني والعشرون", "الثالث والعشرون",
  "الرابع والعشرون", "الخامس والعشرون", "السادس والعشرون", "السابع والعشرون", "الثامن والعشرون",
  "التاسع والعشرون", "الثلاثون",
];

/** 1 → "الجزء الأول". */
export function juzLabel(juz: number): string {
  return `الجزء ${ORDINAL_JUZ[juz - 1] ?? ar(juz)}`;
}

/** "04:34" + "ص"/"م", Latin digits like the iOS clock. */
export function clock(d: Date): { time: string; period: string } {
  const h = d.getHours();
  const m = d.getMinutes();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return {
    time: `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    period: h < 12 ? "ص" : "م",
  };
}

/** "اليوم السبت، 17 أكتوبر" style (Gregorian, Latin digits). */
export function gregorianLabel(d: Date): string {
  const weekday = d.toLocaleDateString("ar", { weekday: "long" });
  const month = d.toLocaleDateString("ar", { month: "long" });
  return `${weekday}، ${d.getDate()} ${month}`;
}

/** "6 جمادى الأولى 1448هـ" (Umm al-Qura calendar). Empty if the runtime lacks it. */
export function hijriLabel(d: Date): string {
  try {
    const parts = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const day = get("day");
    const month = get("month");
    const year = get("year");
    if (!day || !month || !year) return "";
    return `${day} ${month} ${year}هـ`;
  } catch {
    return "";
  }
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "12 أكتوبر 2026" for dates in lists. */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric", numberingSystem: "latn" });
}

/** Minutes → "ساعتان و ١٥ دقيقة"-style compact label. */
export function durationLabel(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 1) return "أقل من دقيقة";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${ar(m)} دقيقة`;
  if (m === 0) return `${ar(h)} ساعة`;
  return `${ar(h)} ساعة و${ar(m)} دقيقة`;
}
