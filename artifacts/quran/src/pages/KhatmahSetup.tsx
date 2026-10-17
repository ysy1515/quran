import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { JUZ_COUNT, surahName } from "@workspace/quran-meta";
import Screen from "@/components/shell/Screen";
import { ListSection } from "@/components/kit/List";
import { ConfirmSheet } from "@/components/kit/Sheet";
import { Icon } from "@/components/icons/Icon";
import {
  MIN_CUSTOM_PORTIONS,
  PLAN_PRESETS,
  createPlan,
  pagesFrom,
  portionAt,
  portionCount,
  startKhatmah,
  useKhatmah,
  type PlanUnit,
} from "@/lib/khatmah";
import { ar, juzLabel } from "@/lib/format";

type Choice = { kind: "preset"; id: string } | { kind: "custom" };

function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex-none w-6 h-6 rounded-full border-2 grid place-items-center transition-colors ${
        checked ? "border-primary bg-primary dark:border-gold dark:bg-gold" : "border-muted-foreground/40"
      }`}
    >
      {checked && <Icon name="check" size={14} strokeWidth={3} className="text-primary-foreground dark:text-[hsl(156_40%_8%)]" />}
    </span>
  );
}

export default function KhatmahSetup() {
  const [, navigate] = useLocation();
  const current = useKhatmah();
  const [choice, setChoice] = useState<Choice>({ kind: "preset", id: "rub" });
  const [days, setDays] = useState(30);
  const [startJuz, setStartJuz] = useState(1);
  const [confirm, setConfirm] = useState(false);

  const maxDays = pagesFrom(startJuz);
  const safeDays = Math.min(Math.max(days || MIN_CUSTOM_PORTIONS, MIN_CUSTOM_PORTIONS), maxDays);

  const options = useMemo((): { unit: PlanUnit; size?: number; portions?: number; startJuz: number } => {
    if (choice.kind === "custom") return { unit: "page", portions: safeDays, startJuz };
    const preset = PLAN_PRESETS.find((p) => p.id === choice.id) ?? PLAN_PRESETS[0]!;
    return { unit: preset.unit, size: preset.size, startJuz };
  }, [choice, safeDays, startJuz]);

  const preview = useMemo(() => {
    const plan = createPlan(options);
    return { plan, count: portionCount(plan), first: portionAt(plan, 0) };
  }, [options]);

  const inProgress = !!current.plan && !current.finished && current.completed > 0;

  const start = () => {
    startKhatmah(createPlan(options));
    toast.success("بدأت ختمة جديدة، وفقك الله");
    navigate("/", { replace: true });
  };

  return (
    <Screen title="ختمة جديدة" back="/">
      <div className="screen__inner pb-10 page-enter">
        <ListSection title="مقدار الورد">
          {PLAN_PRESETS.map((p) => {
            const checked = choice.kind === "preset" && choice.id === p.id;
            const count = portionCount({ unit: p.unit, size: p.size, portions: 1, startJuz });
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={checked}
                className="list-row list-row--plain"
                onClick={() => setChoice({ kind: "preset", id: p.id })}
                data-testid={`plan-${p.id}`}
              >
                <Radio checked={checked} />
                <span className="list-row__body">
                  <span className="list-row__label block">{p.label}</span>
                  <span className="list-row__hint block">{ar(count)} وردًا</span>
                </span>
              </button>
            );
          })}
          <button
            type="button"
            role="radio"
            aria-checked={choice.kind === "custom"}
            className="list-row list-row--plain"
            onClick={() => setChoice({ kind: "custom" })}
            data-testid="plan-custom"
          >
            <Radio checked={choice.kind === "custom"} />
            <span className="list-row__body">
              <span className="list-row__label block">عدد أوراد مخصص</span>
              <span className="list-row__hint block">تُقسَّم الصفحات بالتساوي على عدد الأوراد</span>
            </span>
          </button>
          {choice.kind === "custom" && (
            <div className="list-row list-row--plain">
              <label htmlFor="custom-days" className="list-row__body list-row__label">
                عدد الأوراد
              </label>
              <input
                id="custom-days"
                type="number"
                inputMode="numeric"
                min={MIN_CUSTOM_PORTIONS}
                max={maxDays}
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value, 10))}
                className="time-value w-24 text-center"
                data-testid="custom-days"
              />
            </div>
          )}
        </ListSection>

        <ListSection title="البداية" footer="اختر جزءًا إذا كنت قد قرأت ما قبله، وتبدأ الختمة منه إلى آخر المصحف.">
          <div className="list-row list-row--plain">
            <label htmlFor="start-juz" className="list-row__body list-row__label">
              ابدأ من
            </label>
            <select
              id="start-juz"
              value={startJuz}
              onChange={(e) => setStartJuz(parseInt(e.target.value, 10))}
              className="time-value"
              dir="rtl"
              data-testid="start-juz"
            >
              {Array.from({ length: JUZ_COUNT }, (_, i) => i + 1).map((j) => (
                <option key={j} value={j}>
                  {j === 1 ? "بداية المصحف" : juzLabel(j)}
                </option>
              ))}
            </select>
          </div>
        </ListSection>

        <section className="px-4 mt-6">
          <div className="card px-5 py-4" data-testid="plan-summary">
            <p className="text-sm font-bold text-muted-foreground">ملخص الخطة</p>
            <p className="text-lg font-extrabold text-foreground mt-1">{ar(preview.count)} وردًا</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              الورد الأول: من سورة {surahName(preview.first.from.surah)} آية {ar(preview.first.from.ayah)} إلى سورة{" "}
              {surahName(preview.first.to.surah)} آية {ar(preview.first.to.ayah)} (صفحة {ar(preview.first.fromPage)}
              {preview.first.toPage !== preview.first.fromPage && <> – {ar(preview.first.toPage)}</>})
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary w-full mt-5"
            onClick={() => (inProgress ? setConfirm(true) : start())}
            data-testid="create-khatmah"
          >
            ابدأ الختمة
          </button>
        </section>
      </div>

      <ConfirmSheet
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={start}
        title="استبدال الختمة الحالية؟"
        message={`أتممت ${ar(current.completed)} من ${ar(current.total)} وردًا في الختمة الحالية. ستبدأ الختمة الجديدة من أولها، وتبقى ختماتك المكتملة السابقة في الإحصائيات.`}
        confirmLabel="ابدأ الجديدة"
        danger
      />
    </Screen>
  );
}
