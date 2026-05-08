import { useState, useEffect, useRef, useCallback } from "react";
import * as adhan from "adhan";
import { toast } from "sonner";
import { useLocalNotifications } from "@/hooks/useLocalNotifications";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrayerTime {
  key: string;
  label: string;
  time: Date;
  arabicLabel: string;
}

interface Muezzin {
  id: string;
  name: string;
  mosque: string;
  country: string;
  emoji: string;
  audioUrl: string | null;
}

interface AdhanPrefs {
  enabled: boolean;
  muezzinId: string;
  enabledPrayers: string[];
  snoozedUntil: number | null;
  calcMethod: string;
  madhab: string;
  reminderMinutes: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRAYER_LABELS: Record<string, string> = {
  fajr: "الفجر",
  sunrise: "الشروق",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

// Only the 5 MP3 files actually uploaded to public/audio/adhan/
const MUEZZINS: Muezzin[] = [
  {
    id: "adhan-1",
    name: "أذان ١",
    mosque: "النمط الأول",
    country: "",
    emoji: "🕌",
    audioUrl: "/audio/adhan/adhan-1.mp3",
  },
  {
    id: "adhan-2",
    name: "أذان ٢",
    mosque: "النمط الثاني",
    country: "",
    emoji: "🕌",
    audioUrl: "/audio/adhan/adhan-2.mp3",
  },
  {
    id: "adhan-3",
    name: "أذان ٣",
    mosque: "النمط الثالث",
    country: "",
    emoji: "🕌",
    audioUrl: "/audio/adhan/adhan-3.mp3",
  },
  {
    id: "adhan-4",
    name: "أذان ٤",
    mosque: "النمط الرابع",
    country: "",
    emoji: "🕌",
    audioUrl: "/audio/adhan/adhan-4.mp3",
  },
  {
    id: "adhan-5",
    name: "أذان ٥",
    mosque: "النمط الخامس",
    country: "",
    emoji: "🕌",
    audioUrl: "/audio/adhan/adhan-5.mp3",
  },
];

const CALC_METHODS: { id: string; label: string }[] = [
  { id: "UmmAlQura", label: "أم القرى — السعودية" },
  { id: "MuslimWorldLeague", label: "رابطة العالم الإسلامي" },
  { id: "Egyptian", label: "الهيئة المصرية للمساحة" },
  { id: "Karachi", label: "جامعة العلوم الإسلامية كراتشي" },
  { id: "NorthAmerica", label: "أمريكا الشمالية (ISNA)" },
  { id: "Dubai", label: "دبي" },
  { id: "Kuwait", label: "الكويت" },
  { id: "Qatar", label: "قطر" },
  { id: "Singapore", label: "سنغافورة" },
  { id: "Turkey", label: "تركيا" },
];

const DEFAULT_PREFS: AdhanPrefs = {
  enabled: false,
  muezzinId: "adhan-1",
  enabledPrayers: ["fajr", "dhuhr", "asr", "maghrib", "isha"],
  snoozedUntil: null,
  calcMethod: "UmmAlQura",
  madhab: "Hanafi",
  reminderMinutes: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadPrefs(): AdhanPrefs {
  try {
    const s = localStorage.getItem("adhan_prefs");
    if (s) return { ...DEFAULT_PREFS, ...JSON.parse(s) };
  } catch {}
  return { ...DEFAULT_PREFS };
}

function savePrefs(p: AdhanPrefs) {
  localStorage.setItem("adhan_prefs", JSON.stringify(p));
}

function getCalcParams(method: string): adhan.CalculationParameters {
  const m = adhan.CalculationMethod as Record<string, (() => adhan.CalculationParameters) | undefined>;
  return m[method]?.() ?? adhan.CalculationMethod.UmmAlQura();
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function timeUntil(target: Date): string {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return "الآن";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `بعد ${h}س ${m}د`;
  return `بعد ${m} دقيقة`;
}

function snoozeLabel(until: number | null): string {
  if (!until) return "";
  if (until === -1) return "موقوف حتى التفعيل";
  const d = new Date(until);
  return `موقوف حتى ${d.toLocaleDateString("ar-SA", { weekday: "long", month: "short", day: "numeric" })}`;
}

function isSnoozed(until: number | null): boolean {
  if (!until) return false;
  if (until === -1) return true;
  return Date.now() < until;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Adhan() {
  const [prefs, setPrefs] = useState<AdhanPrefs>(loadPrefs);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string>("");
  const [locError, setLocError] = useState<string>("");
  const [locLoading, setLocLoading] = useState(false);
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [nextPrayer, setNextPrayer] = useState<PrayerTime | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string>("");
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    permission: localNotifPermission,
    requestPermission: requestLocalPermission,
    schedulePrayers,
    cancelAllPrayer,
  } = useLocalNotifications();

  // ── Persist prefs ────────────────────────────────────────────────────────
  const updatePrefs = useCallback((patch: Partial<AdhanPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  // ── Geolocation ──────────────────────────────────────────────────────────
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocError("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    setLocLoading(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setCoords({ lat, lng });
        localStorage.setItem("adhan_coords", JSON.stringify({ lat, lng }));
        setLocLoading(false);
        // Reverse geocode (best-effort)
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`
          );
          const d = await r.json();
          const city = d.address?.city || d.address?.town || d.address?.county || "";
          const country = d.address?.country || "";
          setLocationName([city, country].filter(Boolean).join("، "));
        } catch {
          setLocationName(`${lat.toFixed(2)}°، ${lng.toFixed(2)}°`);
        }
      },
      (err) => {
        setLocLoading(false);
        if (err.code === 1) setLocError("تم رفض الوصول إلى الموقع — يرجى السماح من إعدادات المتصفح");
        else setLocError("تعذّر تحديد الموقع");
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  // Load saved coords on mount
  useEffect(() => {
    const saved = localStorage.getItem("adhan_coords");
    if (saved) {
      try {
        const { lat, lng } = JSON.parse(saved);
        setCoords({ lat, lng });
        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=ar`
        )
          .then((r) => r.json())
          .then((d) => {
            const city = d.address?.city || d.address?.town || d.address?.county || "";
            const country = d.address?.country || "";
            setLocationName([city, country].filter(Boolean).join("، "));
          })
          .catch(() => setLocationName(`${lat.toFixed(2)}°، ${lng.toFixed(2)}°`));
      } catch {}
    }
  }, []);

  // ── Calculate prayer times ───────────────────────────────────────────────
  useEffect(() => {
    if (!coords) return;
    const calc = () => {
      const now = new Date();
      const coordinates = new adhan.Coordinates(coords.lat, coords.lng);
      const params = getCalcParams(prefs.calcMethod);
      params.madhab = prefs.madhab === "Hanafi" ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
      const pt = new adhan.PrayerTimes(coordinates, now, params);

      const times: PrayerTime[] = [
        { key: "fajr",    arabicLabel: "الفجر",   label: "Fajr",    time: pt.fajr    },
        { key: "sunrise", arabicLabel: "الشروق",  label: "Sunrise", time: pt.sunrise },
        { key: "dhuhr",   arabicLabel: "الظهر",   label: "Dhuhr",   time: pt.dhuhr   },
        { key: "asr",     arabicLabel: "العصر",   label: "Asr",     time: pt.asr     },
        { key: "maghrib", arabicLabel: "المغرب",  label: "Maghrib", time: pt.maghrib },
        { key: "isha",    arabicLabel: "العشاء",  label: "Isha",    time: pt.isha    },
      ];
      setPrayerTimes(times);

      // Next prayer
      const upcoming = times
        .filter((t) => t.key !== "sunrise" && t.time > now)
        .sort((a, b) => a.time.getTime() - b.time.getTime());
      setNextPrayer(upcoming[0] ?? null);

      // Check if it's prayer time (within 1 min) and notify
      if (prefs.enabled && !isSnoozed(prefs.snoozedUntil)) {
        for (const t of times) {
          if (t.key === "sunrise") continue;
          if (!prefs.enabledPrayers.includes(t.key)) continue;
          const diff = t.time.getTime() - now.getTime();
          if (diff >= 0 && diff < 60000) {
            showAdhanNotification(t.arabicLabel);
          }
        }
      }
    };

    calc();
    tickRef.current = setInterval(calc, 30000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [coords, prefs.calcMethod, prefs.madhab, prefs.enabled, prefs.snoozedUntil, prefs.enabledPrayers]);

  // ── Adhan notification ───────────────────────────────────────────────────
  const showAdhanNotification = (prayerName: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`🕌 حان وقت ${prayerName}`, {
        body: "حيَّ على الصلاة • حيَّ على الفلاح",
        icon: "/icons/icon-192.png",
        silent: false,
      });
    }
    toast.success(`🕌 حان وقت ${prayerName}`, { duration: 8000 });
  };

  // ── Audio playback ───────────────────────────────────────────────────────
  const playPreview = (muezzin: Muezzin) => {
    setAudioError("");

    if (!muezzin.audioUrl) {
      setAudioError("ملف الأذان غير متوفر حالياً");
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    // Tap again → stop
    if (playingId === muezzin.id || loadingId === muezzin.id) {
      setPlayingId(null);
      setLoadingId(null);
      return;
    }

    setLoadingId(muezzin.id);
    setPlayingId(null);

    const audio = new Audio();
    audioRef.current = audio;

    audio.oncanplay = () => {
      setLoadingId(null);
    };

    audio.onended = () => {
      setPlayingId(null);
      setLoadingId(null);
    };

    audio.onerror = () => {
      setPlayingId(null);
      setLoadingId(null);
      const mediaErr = audioRef.current?.error;
      if (mediaErr && mediaErr.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        setAudioError("ملف الأذان غير متوفر حالياً");
      } else {
        setAudioError("تعذّر تشغيل الأذان، يرجى المحاولة لاحقاً");
      }
    };

    audio.src = muezzin.audioUrl;
    audio.load();

    audio
      .play()
      .then(() => {
        setLoadingId(null);
        setPlayingId(muezzin.id);
      })
      .catch((err: unknown) => {
        setLoadingId(null);
        setPlayingId(null);
        const isAbort = err instanceof DOMException && err.name === "AbortError";
        if (!isAbort) {
          setAudioError("ملف الأذان غير متوفر حالياً");
        }
      });
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setPlayingId(null);
    setLoadingId(null);
  };

  useEffect(() => () => stopAudio(), []);

  // ── Schedule local notifications when prefs/coords change ───────────────
  useEffect(() => {
    schedulePrayers(coords, prefs);
  }, [coords, prefs, schedulePrayers]);

  // ── Enable adhan + request permission ───────────────────────────────────
  const handleEnable = async () => {
    if (!coords) { requestLocation(); return; }
    const granted = await requestLocalPermission();
    if (!granted) {
      toast.error("لم يتم منح إذن الإشعارات — يرجى السماح من إعدادات الجهاز");
      return;
    }
    updatePrefs({ enabled: true, snoozedUntil: null });
    toast.success("تم تفعيل تذكيرات الصلاة ✓");
  };

  const handleDisable = async () => {
    updatePrefs({ enabled: false });
    await cancelAllPrayer();
    toast("تم إيقاف تذكيرات الصلاة");
  };

  // ── Snooze ────────────────────────────────────────────────────────────────
  const snooze = (days: number | "forever") => {
    const until = days === "forever" ? -1 : Date.now() + days * 86400000;
    updatePrefs({ snoozedUntil: until });
    setShowSnoozeMenu(false);
    const label = days === "forever" ? "حتى التفعيل اليدوي" : `${days} أيام`;
    toast.success(`تم إيقاف الأذان ${label}`);
  };

  const resume = () => {
    updatePrefs({ snoozedUntil: null });
    toast.success("تم استئناف الأذان ✓");
  };

  const snoozed = isSnoozed(prefs.snoozedUntil);
  const selectedMuezzin = MUEZZINS.find((m) => m.id === prefs.muezzinId) ?? MUEZZINS[0];

  return (
    <div className="page-enter max-w-xl mx-auto px-4 py-6" dir="rtl">
      <h1 className="font-quran text-2xl font-bold text-foreground mb-1 text-center">الأذان</h1>
      <p className="text-sm text-muted-foreground text-center mb-6">مواقيت الصلاة وتذكير الأذان</p>

      {/* ── Location ───────────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5 text-primary">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">موقعك الحالي</p>
              {coords ? (
                <p className="text-xs text-primary mt-0.5">{locationName || "تم تحديد الموقع ✓"}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">لم يتم تحديد الموقع بعد</p>
              )}
            </div>
          </div>
          <button
            onClick={requestLocation}
            disabled={locLoading}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {locLoading ? (
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3.5 h-3.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            )}
            {coords ? "تحديث" : "تحديد"}
          </button>
        </div>
        {locError && <p className="text-xs text-destructive mt-2 pr-2">{locError}</p>}
      </div>

      {/* ── Prayer Times ───────────────────────────────────────────────────── */}
      {prayerTimes.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden mb-4">
          {/* Next prayer banner */}
          {nextPrayer && (
            <div className="bg-primary/5 border-b border-border px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">الصلاة القادمة</p>
                <p className="font-quran text-lg font-bold text-primary">{nextPrayer.arabicLabel}</p>
              </div>
              <div className="text-left" dir="ltr">
                <p className="font-bold text-foreground text-lg">{formatTime(nextPrayer.time)}</p>
                <p className="text-xs text-muted-foreground">{timeUntil(nextPrayer.time)}</p>
              </div>
            </div>
          )}

          {/* All prayers */}
          <div className="divide-y divide-border">
            {prayerTimes.map((p) => {
              const isNext = nextPrayer?.key === p.key;
              const isPast = p.time < new Date();
              const toggleable = p.key !== "sunrise";
              const isOn = prefs.enabledPrayers.includes(p.key);
              return (
                <div key={p.key} className={`flex items-center px-4 py-3 ${isNext ? "bg-primary/3" : ""}`}>
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${isNext ? "text-primary" : isPast ? "text-muted-foreground" : "text-foreground"}`}>
                      {p.arabicLabel}
                      {isNext && <span className="mr-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">التالية</span>}
                    </p>
                  </div>
                  <p className={`font-mono text-sm ml-3 ${isPast && !isNext ? "text-muted-foreground" : "text-foreground"}`} dir="ltr">
                    {formatTime(p.time)}
                  </p>
                  {toggleable && prefs.enabled && (
                    <button
                      onClick={() => {
                        const list = isOn
                          ? prefs.enabledPrayers.filter((x) => x !== p.key)
                          : [...prefs.enabledPrayers, p.key];
                        updatePrefs({ enabledPrayers: list });
                      }}
                      className={`mr-3 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                        isOn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                      title={isOn ? "إيقاف أذان هذه الصلاة" : "تفعيل"}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                        {isOn
                          ? <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
                          : <><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" /><line x1="1" y1="1" x2="23" y2="23" /></>
                        }
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!coords && !locLoading && (
        <div className="bg-muted/50 border border-border rounded-xl px-4 py-8 mb-4 text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-primary">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <p className="text-sm text-foreground font-medium mb-1">احسب مواقيت صلاتك</p>
          <p className="text-xs text-muted-foreground mb-4">اضغط "تحديد" لتفعيل حساب المواقيت بدقة حسب موقعك</p>
          <button onClick={requestLocation} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            تحديد موقعي
          </button>
        </div>
      )}

      {/* ── Enable / Snooze ────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔔</span>
            <div>
              <p className="font-medium text-foreground text-sm">تذكير الأذان</p>
              {snoozed ? (
                <p className="text-xs text-amber-500 mt-0.5">{snoozeLabel(prefs.snoozedUntil)}</p>
              ) : prefs.enabled ? (
                <p className="text-xs text-primary mt-0.5">مفعّل ✓</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">غير مفعّل</p>
              )}
            </div>
          </div>
          {!prefs.enabled ? (
            <button onClick={handleEnable} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              تفعيل
            </button>
          ) : snoozed ? (
            <button onClick={resume} className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">
              استئناف
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowSnoozeMenu((v) => !v)} className="px-3 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-medium hover:bg-border transition-colors">
                إيقاف مؤقت
              </button>
              <button onClick={handleDisable} className="px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors">
                إيقاف
              </button>
            </div>
          )}
        </div>

        {/* Snooze Menu */}
        {showSnoozeMenu && (
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-xs font-medium text-foreground mb-2">مدة الإيقاف:</p>
            {[
              { label: "⏸ إيقاف لمدة 3 أيام", days: 3 },
              { label: "⏸ إيقاف لمدة 5 أيام", days: 5 },
              { label: "⏸ إيقاف لمدة 7 أيام", days: 7 },
              { label: "🔕 إيقاف حتى التفعيل اليدوي", days: "forever" as const },
            ].map((opt) => (
              <button
                key={String(opt.days)}
                onClick={() => snooze(opt.days)}
                className="w-full text-right px-4 py-2.5 rounded-xl bg-muted hover:bg-border text-sm text-foreground transition-colors"
              >
                {opt.label}
              </button>
            ))}
            <button onClick={() => setShowSnoozeMenu(false)} className="w-full text-center text-xs text-muted-foreground py-1">إلغاء</button>
          </div>
        )}
      </div>

      {/* ── Reminder minutes ───────────────────────────────────────────────── */}
      {prefs.enabled && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4">
          <h2 className="font-medium text-foreground mb-3 flex items-center gap-2">
            <span>⏰</span> وقت التذكير
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            أرسل التنبيه قبل وقت الصلاة بـ:
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {([0, 5, 10, 15] as const).map((min) => (
              <button
                key={min}
                onClick={() => updatePrefs({ reminderMinutes: min })}
                className={`flex-1 min-w-0 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                  prefs.reminderMinutes === min
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                }`}
              >
                {min === 0 ? "عند الأذان" : `${min} دقيقة`}
              </button>
            ))}
          </div>
          {localNotifPermission === "denied" && (
            <p className="text-xs text-destructive mt-3 flex items-center gap-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              تم رفض إذن الإشعارات — افتح إعدادات الجهاز وأعد السماح
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            ملاحظة: قد يختلف صوت الإشعار الكامل حسب قيود iOS وAndroid — الصوت الافتراضي للجهاز هو الأكثر موثوقية
          </p>
        </div>
      )}

      {/* ── Muezzin Selection ──────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <h2 className="font-medium text-foreground mb-1 flex items-center gap-2">
          <span>🎙️</span> أفضل أصوات المؤذنين
        </h2>
        <p className="text-xs text-muted-foreground mb-4">اختر الصوت الذي يؤثر فيك — اضغط ▶ للمعاينة</p>

        {audioError && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs" dir="rtl">{audioError}</div>
        )}

        <div className="space-y-2">
          {MUEZZINS.map((m) => {
            const selected = prefs.muezzinId === m.id;
            const playing = playingId === m.id;
            const loading = loadingId === m.id;
            const hasAudio = !!m.audioUrl;
            return (
              <div
                key={m.id}
                onClick={() => { updatePrefs({ muezzinId: m.id }); if (!playing && !loading) setAudioError(""); }}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl border-2 cursor-pointer transition-all ${
                  selected
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border hover:border-primary/40 bg-transparent hover:bg-muted/40"
                }`}
              >
                {/* Selection indicator */}
                <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  selected ? "border-primary bg-primary" : "border-muted-foreground/30 bg-transparent"
                }`}>
                  {selected && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3.5 h-3.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>

                <span className="text-xl flex-shrink-0">{m.emoji}</span>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${selected ? "text-primary" : "text-foreground"}`}>{m.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.mosque} · {m.country}</p>
                  {!hasAudio && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">ملف الأذان غير متوفر حالياً</p>
                  )}
                </div>

                {selected && !playing && !loading && (
                  <span className="flex-shrink-0 text-xs font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    محدد
                  </span>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!hasAudio) { setAudioError("ملف الأذان غير متوفر حالياً"); return; }
                    (playing || loading) ? stopAudio() : playPreview(m);
                  }}
                  disabled={loading && !playing}
                  className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                    !hasAudio
                      ? "bg-muted/50 text-muted-foreground/40 cursor-not-allowed"
                      : playing
                      ? "bg-primary text-primary-foreground shadow-md"
                      : loading
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  }`}
                  title={!hasAudio ? "ملف الأذان غير متوفر" : playing ? "إيقاف" : loading ? "جاري التحميل..." : "استماع"}
                >
                  {!hasAudio ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
                      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 20l.01 4M8 20h8"/>
                    </svg>
                  ) : loading && !playing ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 animate-spin">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"/>
                    </svg>
                  ) : playing ? (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Calculation Method ─────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <h2 className="font-medium text-foreground mb-3">طريقة الحساب</h2>
        <select
          value={prefs.calcMethod}
          onChange={(e) => updatePrefs({ calcMethod: e.target.value })}
          className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          dir="rtl"
        >
          {CALC_METHODS.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-3 mt-3">
          <p className="text-sm text-muted-foreground">حساب العصر:</p>
          <div className="flex items-center bg-muted rounded-lg p-0.5 text-xs font-bold">
            <button
              onClick={() => updatePrefs({ madhab: "Shafi" })}
              className={`px-3 py-1.5 rounded-md transition-all ${prefs.madhab !== "Hanafi" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              شافعي / مالكي
            </button>
            <button
              onClick={() => updatePrefs({ madhab: "Hanafi" })}
              className={`px-3 py-1.5 rounded-md transition-all ${prefs.madhab === "Hanafi" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              حنفي
            </button>
          </div>
        </div>
      </div>

      {/* ── Info ───────────────────────────────────────────────────────────── */}
      <div className="bg-muted/40 rounded-xl px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground leading-relaxed">
          يُحسب الأذان باستخدام موقعك الجغرافي وفق الطريقة المختارة · يعمل بدون اتصال بالإنترنت بعد تحديد الموقع
        </p>
      </div>
    </div>
  );
}
