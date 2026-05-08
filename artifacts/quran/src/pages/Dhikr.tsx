import { useState, useEffect, useCallback, useRef } from "react";

interface DhikrPreset {
  text: string;
  transliteration: string;
  target: number;
  virtue: string;
}

const PRESETS: DhikrPreset[] = [
  { text: "سُبْحَانَ اللَّهِ", transliteration: "Subhan Allah", target: 33, virtue: "تسبيح" },
  { text: "الْحَمْدُ لِلَّهِ", transliteration: "Alhamdulillah", target: 33, virtue: "تحميد" },
  { text: "اللَّهُ أَكْبَرُ", transliteration: "Allahu Akbar", target: 34, virtue: "تكبير" },
  { text: "لَا إِلَهَ إِلَّا اللَّهُ", transliteration: "La ilaha illallah", target: 100, virtue: "توحيد" },
  { text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", transliteration: "Subhan Allahi wa bihamdihi", target: 100, virtue: "تسبيح وتحميد" },
  { text: "سُبْحَانَ اللَّهِ الْعَظِيمِ", transliteration: "Subhan Allahil Azim", target: 100, virtue: "تسبيح" },
  { text: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ", transliteration: "Allahumma salli ala Muhammad", target: 100, virtue: "صلاة على النبي" },
  { text: "أَسْتَغْفِرُ اللَّهَ", transliteration: "Astaghfirullah", target: 100, virtue: "استغفار" },
];

const TARGETS = [33, 34, 99, 100, 1000];

function ProgressRing({ count, target, size = 280 }: { count: number; target: number; size?: number }) {
  const stroke = 8;
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(count / target, 1);
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="absolute inset-0" style={{ transform: "rotate(-90deg)" }}>
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-border"
        opacity={0.3}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-primary transition-all duration-300 ease-out"
      />
    </svg>
  );
}

export default function Dhikr() {
  const [count, setCount] = useState(0);
  const [preset, setPreset] = useState(PRESETS[0]);
  const [target, setTarget] = useState(33);
  const [showPresets, setShowPresets] = useState(false);
  const [showTargets, setShowTargets] = useState(false);
  const [tapping, setTapping] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [sessions, setSessions] = useState(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef = useRef(false);

  // Load state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("dhikr-state");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.presetText) {
          const found = PRESETS.find((p) => p.text === s.presetText);
          if (found) setPreset(found);
        }
        if (s.target) setTarget(s.target);
        if (s.sessions) setSessions(s.sessions);
      } catch {}
    }
  }, []);

  // Save state
  useEffect(() => {
    localStorage.setItem("dhikr-state", JSON.stringify({ presetText: preset.text, target, sessions }));
  }, [preset, target, sessions]);

  const vibrate = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate(30);
    }
  };

  const handleTap = useCallback(() => {
    if (tapping) return;

    vibrate();
    setTapping(true);

    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => setTapping(false), 150);

    setCount((prev) => {
      const next = prev + 1;
      if (next >= target && !completedRef.current) {
        completedRef.current = true;
        setCompleted(true);
        setSessions((s) => s + 1);
        if ("vibrate" in navigator) navigator.vibrate([60, 40, 60, 40, 100]);
        setTimeout(() => {
          setCompleted(false);
          completedRef.current = false;
        }, 2000);
      }
      return next;
    });
  }, [target, tapping]);

  const handleReset = () => {
    setCount(0);
    setCompleted(false);
    completedRef.current = false;
  };

  const handleSelectPreset = (p: DhikrPreset) => {
    setPreset(p);
    setTarget(p.target);
    setCount(0);
    setCompleted(false);
    completedRef.current = false;
    setShowPresets(false);
  };

  const handleSelectTarget = (t: number) => {
    setTarget(t);
    setCount(0);
    setCompleted(false);
    completedRef.current = false;
    setShowTargets(false);
  };

  const progress = Math.min(count / target, 1);
  const percentage = Math.round(progress * 100);
  const remaining = Math.max(target - count, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background select-none" dir="rtl">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
        <h1 className="font-quran text-xl font-bold text-foreground">عداد الأذكار</h1>
        <div className="flex items-center gap-2">
          {sessions > 0 && (
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
              {sessions} دورة
            </div>
          )}
          <button
            onClick={handleReset}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-border transition-colors active:scale-95"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Dhikr Text */}
      <div className="px-5 text-center mb-2 flex-shrink-0">
        <button
          onClick={() => { setShowPresets(true); setShowTargets(false); }}
          className="inline-block"
        >
          <p className="font-quran text-2xl font-bold text-foreground leading-relaxed hover:text-primary transition-colors">
            {preset.text}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{preset.transliteration}</p>
        </button>
      </div>

      {/* Main Tap Area */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="relative w-72 h-72 flex items-center justify-center">
          {/* Progress Ring */}
          <ProgressRing count={count} target={target} size={288} />

          {/* Tap Button */}
          <button
            onPointerDown={handleTap}
            className={`relative w-52 h-52 rounded-full flex flex-col items-center justify-center cursor-pointer outline-none transition-all duration-150 z-10
              ${completed
                ? "bg-primary shadow-lg shadow-primary/30 scale-105"
                : tapping
                  ? "bg-primary/90 scale-95 shadow-inner"
                  : "bg-primary/10 hover:bg-primary/15 active:scale-95 border-2 border-primary/20"
              }
            `}
            style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
          >
            {/* Ripple on tap */}
            {tapping && (
              <span className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
            )}

            {/* Completed celebration */}
            {completed ? (
              <div className="flex flex-col items-center gap-1">
                <span className="text-4xl">✓</span>
                <p className="text-primary-foreground font-bold text-sm">أحسنت!</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span
                  className={`text-6xl font-bold tabular-nums transition-all duration-150 ${
                    tapping ? "text-primary-foreground scale-110" : "text-primary"
                  }`}
                  style={{ fontVariantNumeric: "tabular-nums", direction: "ltr" }}
                >
                  {count}
                </span>
                {count === 0 && (
                  <p className={`text-sm font-medium transition-colors ${tapping ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    اضغط للبدء
                  </p>
                )}
              </div>
            )}
          </button>

          {/* Progress % label */}
          {count > 0 && !completed && (
            <div className="absolute bottom-0 right-0 text-xs text-muted-foreground font-medium bg-card border border-border rounded-full px-2 py-0.5">
              {percentage}%
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-6 pb-4 flex items-center justify-center gap-6 text-center flex-shrink-0">
        <div>
          <p className="text-2xl font-bold text-foreground" style={{ direction: "ltr" }}>{count}</p>
          <p className="text-xs text-muted-foreground">العدد</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div>
          <button
            onClick={() => { setShowTargets(true); setShowPresets(false); }}
            className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors"
            style={{ direction: "ltr" }}
          >
            {target}
          </button>
          <p className="text-xs text-muted-foreground">الهدف</p>
        </div>
        <div className="w-px h-8 bg-border" />
        <div>
          <p className="text-2xl font-bold text-foreground" style={{ direction: "ltr" }}>
            {remaining}
          </p>
          <p className="text-xs text-muted-foreground">المتبقي</p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pb-6 flex gap-2 flex-shrink-0">
        <button
          onClick={() => { setShowPresets(true); setShowTargets(false); }}
          className="flex-1 py-3 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:border-primary/30 transition-colors active:scale-95 flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          اختر الذكر
        </button>
        <button
          onClick={() => { setShowTargets(true); setShowPresets(false); }}
          className="flex-1 py-3 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:border-primary/30 transition-colors active:scale-95 flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          الهدف: {target}
        </button>
      </div>

      {/* Presets Sheet */}
      {showPresets && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPresets(false)} />
          <div className="relative bg-card rounded-t-2xl border-t border-border shadow-xl max-h-[70vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-5 py-3 border-b border-border flex-shrink-0">
              <h2 className="font-semibold text-foreground text-base">اختر الذكر</h2>
            </div>
            <div className="overflow-y-auto flex-1 p-3">
              {PRESETS.map((p) => (
                <button
                  key={p.text}
                  onClick={() => handleSelectPreset(p)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-xl mb-2 text-right transition-all ${
                    preset.text === p.text
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-muted/50 hover:bg-muted border border-transparent"
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-quran text-base font-bold text-foreground">{p.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.virtue} • الهدف: {p.target}</p>
                  </div>
                  {preset.text === p.text && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Target Sheet */}
      {showTargets && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTargets(false)} />
          <div className="relative bg-card rounded-t-2xl border-t border-border shadow-xl">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-5 py-3 border-b border-border">
              <h2 className="font-semibold text-foreground text-base">اختر الهدف</h2>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              {TARGETS.map((t) => (
                <button
                  key={t}
                  onClick={() => handleSelectTarget(t)}
                  className={`py-4 rounded-xl text-xl font-bold transition-all active:scale-95 ${
                    target === t
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted text-foreground hover:bg-border"
                  }`}
                  style={{ direction: "ltr" }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="px-4 pb-6">
              <p className="text-xs text-muted-foreground text-center">
                بعد كل 33 تسبيحة وتحميدة و34 تكبيرة = 100
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
