import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import Screen from "@/components/shell/Screen";
import { Icon } from "@/components/icons/Icon";
import { useLocalNotifications } from "@/hooks/useLocalNotifications";
import {
  isSnoozed,
  nextPrayer,
  prayerTimesFor,
  requestLocation,
  updateAdhanPrefs,
  useAdhanPrefs,
  useCoords,
  usePlace,
  lookupPlaceName,
  type PrayerTime,
} from "@/lib/prayer";
import { clock, gregorianLabel, hijriLabel, sameDay } from "@/lib/format";

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function Countdown({ target, now }: { target: Date; now: Date }) {
  const diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return (
    <div
      className="flex items-baseline justify-center gap-2 font-light tabular-nums"
      dir="ltr"
      role="timer"
      aria-label={`${h} ساعة و ${m} دقيقة و ${s} ثانية`}
      data-testid="prayer-countdown"
    >
      <span className="text-[3.25rem] leading-none tracking-tight">
        {pad(h)}:{pad(m)}
      </span>
      <span className="text-[1.6rem] leading-none opacity-90">{pad(s)}</span>
    </div>
  );
}

export default function Adhan() {
  const [, navigate] = useLocation();
  const prefs = useAdhanPrefs();
  const coords = useCoords();
  const place = usePlace();
  const now = useNow(1000);
  const [dayOffset, setDayOffset] = useState(0);
  const [locLoading, setLocLoading] = useState(false);
  const { requestPermission } = useLocalNotifications();
  const announced = useRef<string>("");

  // Refresh the place name once if we have coordinates but no saved name.
  useEffect(() => {
    if (coords && !place) void lookupPlaceName(coords);
  }, [coords, place]);

  const day = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    return d;
    // Only recompute when the calendar day or offset changes, not every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayOffset, now.toDateString()]);

  const times: PrayerTime[] = useMemo(() => (coords ? prayerTimesFor(coords, day, prefs) : []), [coords, day, prefs]);
  const next = useMemo(
    () => (coords ? nextPrayer(coords, now, prefs) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coords, prefs, Math.floor(now.getTime() / 30000)],
  );

  const showingToday = sameDay(day, now);
  const snoozed = isSnoozed(prefs.snoozedUntil);

  // While this screen is open, announce the adhan in-app at prayer time (as before).
  useEffect(() => {
    if (!coords || !prefs.enabled || snoozed) return;
    for (const t of prayerTimesFor(coords, now, prefs)) {
      if (t.key === "sunrise" || !prefs.enabledPrayers.includes(t.key)) continue;
      const diff = now.getTime() - t.time.getTime();
      const key = `${t.key}-${t.time.toDateString()}`;
      if (diff >= 0 && diff < 60000 && announced.current !== key) {
        announced.current = key;
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`حان وقت ${t.label}`, { body: "حيَّ على الصلاة • حيَّ على الفلاح", silent: false });
        }
        toast.success(`حان وقت ${t.label}`, { duration: 8000 });
      }
    }
  }, [now, coords, prefs, snoozed]);

  const locate = async () => {
    setLocLoading(true);
    try {
      await requestLocation();
    } catch (err) {
      const denied = (err as GeolocationPositionError)?.code === 1;
      toast.error(denied ? "تم رفض الوصول إلى الموقع، يرجى السماح من الإعدادات" : "تعذّر تحديد الموقع");
    } finally {
      setLocLoading(false);
    }
  };

  const toggleBell = async (key: string) => {
    const on = prefs.enabledPrayers.includes(key);
    if (!prefs.enabled) {
      const granted = await requestPermission();
      if (!granted) {
        toast.error("لم يتم منح إذن الإشعارات، يرجى السماح من إعدادات الجهاز");
        return;
      }
      updateAdhanPrefs({
        enabled: true,
        snoozedUntil: null,
        enabledPrayers: on ? prefs.enabledPrayers : [...prefs.enabledPrayers, key],
      });
      toast.success("تم تفعيل تذكيرات الصلاة");
      return;
    }
    updateAdhanPrefs({
      enabledPrayers: on ? prefs.enabledPrayers.filter((x) => x !== key) : [...prefs.enabledPrayers, key],
    });
  };

  const hijri = hijriLabel(day);

  return (
    <Screen
      title="مواقيت الصلاة"
      subtitle={place || undefined}
      heroHeader
      startActions={[
        {
          label: "إعدادات الأذان",
          icon: <Icon name="gear" size={24} />,
          onClick: () => navigate("/adhan/settings"),
          testId: "prayer-settings",
        },
      ]}
      headerExtra={
        <div className="relative z-[1]">
          <div className="text-center pt-2 pb-5 px-4" data-testid="prayer-hero">
            {coords && next ? (
              <>
                <p className="text-[1.0625rem] font-bold text-[hsl(var(--header-muted))]">باقي على أذان {next.label}</p>
                <div className="mt-2">
                  <Countdown target={next.time} now={now} />
                </div>
              </>
            ) : (
              <>
                <p className="text-[1.0625rem] font-bold text-[hsl(var(--header-muted))]">حدّد موقعك لحساب مواقيت الصلاة</p>
                <button type="button" className="btn btn-gold mt-4 px-8" onClick={locate} disabled={locLoading} data-testid="locate">
                  <Icon name="location" size={20} strokeWidth={2} />
                  {locLoading ? "جاري التحديد..." : "تحديد موقعي"}
                </button>
              </>
            )}
          </div>
          <div className="flex items-center justify-between bg-black/15 px-2 py-1.5">
            <button
              type="button"
              className="header-btn"
              aria-label="اليوم السابق"
              onClick={() => setDayOffset((d) => d - 1)}
              data-testid="prev-day"
            >
              <Icon name="chevronStart" size={26} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="text-center leading-snug min-h-11 px-3"
              onClick={() => setDayOffset(0)}
              aria-label="العودة إلى اليوم"
            >
              <span className="block text-[1.0625rem] font-bold">
                {showingToday ? "اليوم " : ""}
                {gregorianLabel(day)}
              </span>
              {hijri && <span className="block text-[0.95rem] font-semibold opacity-90">{hijri}</span>}
            </button>
            <button
              type="button"
              className="header-btn"
              aria-label="اليوم التالي"
              onClick={() => setDayOffset((d) => d + 1)}
              data-testid="next-day"
            >
              <Icon name="chevronEnd" size={26} strokeWidth={2} />
            </button>
          </div>
        </div>
      }
    >
      <div className="screen__inner">
        {snoozed && prefs.enabled && (
          <button
            type="button"
            onClick={() => updateAdhanPrefs({ snoozedUntil: null })}
            className="w-full flex items-center gap-3 px-5 py-3 bg-gold/15 text-gold-deep font-bold text-sm text-right"
          >
            <Icon name="bellOff" size={20} />
            <span className="flex-1">الأذان موقوف مؤقتًا</span>
            <span className="underline">استئناف</span>
          </button>
        )}
        {coords ? (
          <ul className="bg-card" data-testid="prayer-list">
            {times.map((p) => {
              const isNext = showingToday && next?.key === p.key && sameDay(next.time, p.time);
              const c = clock(p.time);
              const toggleable = p.key !== "sunrise";
              const on = prefs.enabled && !snoozed && prefs.enabledPrayers.includes(p.key);
              return (
                <li
                  key={p.key}
                  className={`flex items-center gap-3 px-5 min-h-[56px] border-b border-border/70 last:border-b-0 ${
                    isNext ? "bg-primary/[0.09] dark:bg-gold/10" : ""
                  }`}
                  data-testid={`prayer-${p.key}`}
                  aria-current={isNext ? "time" : undefined}
                >
                  <span
                    className={`flex-1 text-[1.125rem] ${
                      isNext ? "font-extrabold text-primary dark:text-gold" : "font-semibold text-foreground"
                    }`}
                  >
                    {p.label}
                  </span>
                  <span
                    className={`tabular-nums text-[1.125rem] ${isNext ? "font-extrabold text-primary dark:text-gold" : "text-foreground"}`}
                    dir="ltr"
                  >
                    {c.time} <span className="text-base">{c.period}</span>
                  </span>
                  {toggleable ? (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`تنبيه أذان ${p.label}`}
                      onClick={() => void toggleBell(p.key)}
                      className={`w-11 h-11 -ml-2 rounded-full grid place-items-center transition-colors active:scale-90 ${
                        on ? "text-primary dark:text-gold" : "text-muted-foreground/45"
                      }`}
                      data-testid={`bell-${p.key}`}
                    >
                      <Icon name={on ? "bell" : "bellOff"} size={24} />
                    </button>
                  ) : (
                    <span className="w-11 -ml-2" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-center text-sm text-muted-foreground px-8 py-14 leading-relaxed">
            تُحسب المواقيت على جهازك حسب موقعك وطريقة الحساب المختارة، وتعمل بدون اتصال بالإنترنت بعد تحديد الموقع.
          </p>
        )}
        {coords && !prefs.enabled && (
          <p className="text-center text-xs text-muted-foreground px-8 py-5 leading-relaxed">
            اضغط على أيقونة الجرس بجانب أي صلاة لتفعيل تنبيه الأذان لها.
          </p>
        )}
      </div>
    </Screen>
  );
}
