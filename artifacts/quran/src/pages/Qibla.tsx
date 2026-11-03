import { useEffect, useState } from "react";
import Screen from "@/components/shell/Screen";
import { ListRow, ListSection } from "@/components/kit/List";
import { getCapacitorPlatform } from "@/lib/appConfig";
import { requestLocation, useCoords } from "@/lib/prayer";
import { QiblaCompass, distanceToKaaba, qiblaBearing, relativeBearing, type CompassReading } from "@/lib/qibla";

export default function Qibla() {
  const coords = useCoords();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reading, setReading] = useState<CompassReading | null>(null);
  const [message, setMessage] = useState("حدّد موقعك الحالي لحساب اتجاه القبلة.");
  const [portrait, setPortrait] = useState(() => window.matchMedia("(orientation: portrait)").matches);
  const ios = getCapacitorPlatform() === "ios";
  useEffect(() => {
    const media = window.matchMedia("(orientation: portrait)");
    const update = () => setPortrait(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!active || !ios) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const stop = () => { void QiblaCompass.stop().catch(() => undefined); };
    const poll = async () => {
      try {
        const result = await QiblaCompass.read();
        if (cancelled) return;
        setReading(result);
        setMessage(result.valid ? "وجّه أعلى الهاتف باتجاه السهم." : "بانتظار قراءة دقيقة… ابتعد عن المعادن وحرّك الهاتف لمعايرة البوصلة.");
        timer = setTimeout(() => void poll(), 250);
      } catch {
        if (!cancelled) { setReading(null); setMessage("تعذّرت قراءة البوصلة. تحقق من إذن الموقع ثم أعد المحاولة."); setActive(false); }
      }
    };
    void QiblaCompass.start().then(() => {
      if (cancelled) stop();
      else void poll();
    }).catch(() => {
      if (!cancelled) { setMessage("البوصلة غير متاحة على هذا الجهاز. يمكنك استخدام زاوية القبلة من الشمال الحقيقي."); setActive(false); }
    });
    const visibility = () => {
      if (document.visibilityState !== "visible") { setReading(null); setActive(false); }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => { cancelled = true; clearTimeout(timer); stop(); document.removeEventListener("visibilitychange", visibility); };
  }, [active, ios]);
  const locate = async () => {
    setBusy(true); setActive(false); setReading(null);
    setMessage("جارٍ تحديد موقعك الحالي…");
    try {
      await requestLocation();
      if (ios) { setMessage("بانتظار قراءة البوصلة…"); setActive(true); }
      else setMessage("زاوية القبلة محسوبة من الشمال الحقيقي. البوصلة المتحركة متاحة في نسخة الآيفون.");
    } catch {
      setMessage("تعذّر الحصول على موقع دقيق. فعّل الموقع الدقيق في إعدادات الجهاز، ثم حاول في مكان مفتوح.");
    } finally { setBusy(false); }
  };
  const liveCoords = reading?.valid && typeof reading.lat === "number" && typeof reading.lng === "number"
    ? { lat: reading.lat, lng: reading.lng } : coords;
  const bearing = liveCoords ? qiblaBearing(liveCoords) : null;
  const nearKaaba = liveCoords && distanceToKaaba(liveCoords) < Math.max(100, (reading?.locationAccuracy ?? 0) * 3);
  const valid = !nearKaaba && portrait && reading?.valid && typeof reading.heading === "number" && bearing !== null;
  const turn = valid ? relativeBearing(bearing!, reading!.heading!) : null;
  const aligned = turn !== null && Math.abs(turn) <= 5 && (reading?.accuracy ?? 180) <= 10;
  return (
    <Screen title="القبلة" back="/more">
      <div className="px-5 py-6 space-y-6 text-center">
        <div className="flex flex-col items-center gap-2" data-testid="qibla-kaaba">
          <svg role="img" aria-label="الكعبة المشرفة" width="72" height="72" viewBox="0 0 80 80">
            <path d="M10 24 43 12 70 24 37 38Z" fill="#343833" />
            <path d="M10 24 37 38V70L10 55Z" fill="#20271f" />
            <path d="M37 38 70 24V55L37 70Z" fill="#121b14" />
            <path d="M10 32 37 46V52L10 38Z" fill="#c7a447" />
            <path d="M37 46 70 32V38L37 52Z" fill="#e5c569" />
            <path d="M49 49 58 45V60L49 64Z" fill="#c7a447" />
          </svg>
          <p className="font-bold">الكعبة المشرفة</p>
          <p className="text-sm text-muted-foreground">أدر الهاتف حتى يتجه السهم إلى الكعبة في الأعلى</p>
        </div>
        <div className={`relative mx-auto w-64 h-64 rounded-full border-4 flex items-center justify-center ${aligned ? "border-primary bg-primary/10" : "border-border bg-card"}`}>
          <span className="absolute top-3 text-sm">أعلى الهاتف</span>
          {turn !== null ? (
            <svg data-testid="qibla-arrow" aria-label="اتجاه القبلة بالنسبة للهاتف" width="130" height="150" viewBox="0 0 130 150" style={{ transform: `rotate(${turn}deg)` }}>
              <path d="M65 15 L105 110 L65 90 L25 110 Z" fill="currentColor" className="text-primary" />
            </svg>
          ) : <span className="text-muted-foreground px-8">{!portrait ? "أمسك الهاتف عموديًا" : "بانتظار تحديد الاتجاه"}</span>}
        </div>
        <p role="status" data-testid="qibla-status" className="text-sm leading-relaxed">{nearKaaba ? "أنت قريب من الكعبة؛ اتبع اتجاهها وعلامات الصلاة داخل الحرم." : aligned ? "أنت باتجاه القبلة — ضمن دقة الحساس" : message}</p>
        {bearing !== null && !nearKaaba && <p data-testid="qibla-bearing" className="font-bold">{bearing.toFixed(1)}° من الشمال الحقيقي {reading?.valid ? "" : "· حسب الموقع المحفوظ"}</p>}
        {valid && <p className="text-xs text-muted-foreground">دقة البوصلة التقريبية ±{Math.round(reading!.accuracy!)}° · دقة الموقع {Math.round(reading!.locationAccuracy!)} متر</p>}
        <button className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-bold disabled:opacity-50" disabled={busy} onClick={() => void locate()}>{busy ? "جارٍ تحديد الموقع…" : "تحديد موقعي وتشغيل القبلة"}</button>
        <ListSection title="لأفضل دقة" footer="دقة الاتجاه تتأثر بحساس الهاتف والمجال المغناطيسي. داخل الحرم اتبع اتجاه الكعبة وعلامات الصلاة.">
          <ListRow label="أمسك الهاتف مسطحًا وشاشته للأعلى" hint="بوضع الشاشة العمودي، بعيدًا عن المعادن والأغطية المغناطيسية" />
          <ListRow label="فعّل الموقع الدقيق" hint="تحتاج البوصلة إلى موقع حديث لحساب الشمال الحقيقي" />
        </ListSection>
      </div>
    </Screen>
  );
}
