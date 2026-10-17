import { useRef, useState } from "react";
import Screen from "@/components/shell/Screen";
import Sheet, { ConfirmSheet } from "@/components/kit/Sheet";
import { Icon } from "@/components/icons/Icon";
import { chooseDhikr, resetDhikrCount, setDhikrTarget, tapDhikr, useDhikrState } from "@/lib/dhikr";
import { hapticSuccess, hapticTap } from "@/lib/haptics";
import { ar } from "@/lib/format";

interface DhikrPreset {
  text: string;
  transliteration: string;
  target: number;
  virtue: string;
}

export const PRESETS: DhikrPreset[] = [
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

function ProgressRing({ progress }: { progress: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="3.2" className="stroke-border" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - progress)}
        className="stroke-gold transition-[stroke-dashoffset] duration-300 ease-out"
      />
    </svg>
  );
}

export default function Dhikr() {
  const state = useDhikrState();
  const preset = PRESETS.find((p) => p.text === state.presetText) ?? { ...PRESETS[0]!, text: state.presetText };
  const [sheet, setSheet] = useState<"presets" | "targets" | "reset" | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const { count, target, sessions } = state;
  const progress = Math.min(count / target, 1);
  const remaining = Math.max(target - count, 0);

  const tap = () => {
    if (tapDhikr()) {
      hapticSuccess();
      setCelebrate(true);
      clearTimeout(celebrateTimer.current);
      celebrateTimer.current = setTimeout(() => setCelebrate(false), 1600);
    } else {
      hapticTap();
    }
  };

  return (
    <Screen
      title="التسبيح"
      back="/athkar"
      endActions={[
        {
          label: "تصفير العداد",
          icon: <Icon name="refresh" size={24} />,
          onClick: () => (count > 0 ? setSheet("reset") : undefined),
          testId: "dhikr-reset",
        },
      ]}
      bodyClassName="flex flex-col"
    >
      <div className="flex-1 flex flex-col items-center px-5 pt-5 pb-5 select-none min-h-[440px]">
        <button
          type="button"
          onClick={() => setSheet("presets")}
          className="card press w-full px-5 py-4 text-center"
          aria-label={`الذكر الحالي ${preset.text}، اضغط لتغييره`}
          data-testid="dhikr-preset"
        >
          <p className="font-quran text-center text-[1.7rem] leading-[1.9] text-foreground">{preset.text}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {preset.virtue}، <span dir="ltr">{preset.transliteration}</span>
          </p>
        </button>

        <div className="flex-1 w-full grid place-items-center py-5">
          <div className="relative aspect-square w-[min(74vw,42vh,300px)]">
            <ProgressRing progress={progress} />
            <button
              type="button"
              onClick={tap}
              className={`absolute inset-[9%] rounded-full grid place-items-center transition-transform duration-100 active:scale-95 shadow-[var(--elev-3)] ${
                celebrate
                  ? "bg-gradient-to-b from-gold to-gold-deep text-[hsl(156_40%_8%)]"
                  : "bg-gradient-to-b from-[hsl(152_42%_24%)] to-[hsl(156_44%_12%)] text-white"
              }`}
              style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
              aria-label={`سبّح. العدد ${count} من ${target}`}
              data-testid="dhikr-tap"
            >
              <span className="flex flex-col items-center">
                {celebrate ? (
                  <>
                    <Icon name="check" size={48} strokeWidth={2.6} />
                    <span className="font-bold mt-1">أتممت الدورة</span>
                  </>
                ) : (
                  <>
                    <span className="text-[4rem] leading-none font-bold tabular-nums" data-testid="dhikr-count">
                      {ar(count)}
                    </span>
                    <span className="text-sm opacity-80 mt-2">{count === 0 ? "اضغط للتسبيح" : `من ${ar(target)}`}</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {celebrate ? "أتممت الدورة" : count > 0 && count % 10 === 0 ? `${count}` : ""}
        </p>

        <div className="card w-full grid grid-cols-3 divide-x divide-x-reverse divide-border text-center py-3">
          <div>
            <p className="text-xl font-extrabold text-foreground">{ar(remaining)}</p>
            <p className="text-xs text-muted-foreground">المتبقي</p>
          </div>
          <button type="button" onClick={() => setSheet("targets")} className="min-h-11" data-testid="dhikr-target">
            <p className="text-xl font-extrabold text-primary dark:text-gold">{ar(target)}</p>
            <p className="text-xs text-muted-foreground">الهدف</p>
          </button>
          <div>
            <p className="text-xl font-extrabold text-foreground" data-testid="dhikr-sessions">{ar(sessions)}</p>
            <p className="text-xs text-muted-foreground">الدورات</p>
          </div>
        </div>
      </div>

      <Sheet open={sheet === "presets"} onClose={() => setSheet(null)} title="اختر الذكر">
        <div className="list-group -mx-1">
          {PRESETS.map((p) => {
            const active = p.text === state.presetText;
            return (
              <button
                key={p.text}
                type="button"
                className="list-row list-row--plain"
                aria-pressed={active}
                onClick={() => {
                  chooseDhikr(p.text, p.target);
                  setSheet(null);
                }}
              >
                <span className="list-row__body">
                  <span className="list-row__label block font-quran text-lg">{p.text}</span>
                  <span className="list-row__hint block">
                    {p.virtue}، الهدف {ar(p.target)}
                  </span>
                </span>
                {active && <Icon name="checkCircle" size={22} className="text-primary dark:text-gold" />}
              </button>
            );
          })}
        </div>
      </Sheet>

      <Sheet open={sheet === "targets"} onClose={() => setSheet(null)} title="اختر الهدف">
        <div className="grid grid-cols-3 gap-3 pb-2">
          {TARGETS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={t === target}
              onClick={() => {
                setDhikrTarget(t);
                setSheet(null);
              }}
              className={`btn ${t === target ? "btn-primary" : "btn-soft"} text-lg`}
            >
              {ar(t)}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center pt-3 pb-2">تغيير الهدف يبدأ العدّ من الصفر.</p>
      </Sheet>

      <ConfirmSheet
        open={sheet === "reset"}
        onClose={() => setSheet(null)}
        onConfirm={resetDhikrCount}
        title="تصفير العداد؟"
        message={`سيبدأ العدّ من الصفر. تبقى الدورات المكتملة (${ar(sessions)}).`}
        confirmLabel="تصفير"
        danger
      />
    </Screen>
  );
}
