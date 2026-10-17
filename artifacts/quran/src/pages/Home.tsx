import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useGetPage, getGetPageQueryKey } from "@workspace/api-client-react";
import { surahName, compareAyah, type AyahRef } from "@workspace/quran-meta";
import Screen from "@/components/shell/Screen";
import { Icon } from "@/components/icons/Icon";
import FeatureArt from "@/components/art/FeatureArt";
import { completeCurrentPortion, isWithin, undoLastPortion, useKhatmah, type Portion } from "@/lib/khatmah";
import { useReadingProgress } from "@/lib/userData";
import { ar, awradLabel, juzLabel, shortDate } from "@/lib/format";
import { readerHref } from "@/lib/useQuranLinks";
import { shareOrCopy } from "@/lib/share";
import { hapticSuccess } from "@/lib/haptics";

function refLabel(ref: AyahRef) {
  return `سورة ${surahName(ref.surah)} - آية ${ar(ref.ayah)}`;
}

/** Opening ayat of the portion, exactly as served by the Quran source. */
function AyahPreview({ portion }: { portion: Portion }) {
  const { data, isLoading, isError } = useGetPage(portion.fromPage, {
    query: { queryKey: getGetPageQueryKey(portion.fromPage) },
  });

  if (isLoading) {
    return (
      <div className="space-y-3 py-6" aria-label="جاري تحميل الآيات">
        <div className="skeleton h-6 rounded-lg w-11/12 mx-auto" />
        <div className="skeleton h-6 rounded-lg w-8/12 mx-auto" />
      </div>
    );
  }
  const verses = Array.isArray(data?.verses) ? data.verses : [];
  const start = verses.findIndex((v) => v.verseKey === `${portion.from.surah}:${portion.from.ayah}`);
  if (isError || start < 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground" data-testid="wird-preview-unavailable">
        تعذّر تحميل نص الآيات الآن. يمكنك متابعة القراءة من المصحف.
      </p>
    );
  }
  const first = verses[start]!;
  const shown = [first];
  const second = verses[start + 1];
  if (second && first.text.length < 70 && second.verseKey.startsWith(`${portion.from.surah}:`)) shown.push(second);

  // Long opening ayat get a smaller size so the card keeps its shape.
  const length = shown.reduce((n, v) => n + v.text.length, 0);
  const size = length <= 90 ? "text-[1.45rem]" : length <= 220 ? "text-[1.25rem]" : "text-[1.1rem]";

  return (
    <p className={`font-quran text-center text-foreground py-5 px-1 leading-[2.25] ${size}`} dir="rtl" data-testid="wird-preview">
      <span className="text-gold-deep">﴿</span>
      {shown.map((v) => (
        <span key={v.verseKey}>
          {v.text}
          <span className="ayah-mark">{ar(v.verseNumber)}</span>
        </span>
      ))}
      <span className="text-gold-deep">﴾</span>
    </p>
  );
}

function WirdCard({ portion }: { portion: Portion }) {
  return (
    <article className="card card--raised overflow-hidden" data-testid="wird-card">
      <div className="flex items-center justify-between px-5 pt-4 text-[0.95rem] font-bold text-primary dark:text-gold">
        <span>من قوله تعالى</span>
        <span>{juzLabel(portion.juz)}</span>
      </div>
      <div className="px-4">
        <AyahPreview portion={portion} />
      </div>
      <dl className="px-5 pb-4 text-[0.95rem] font-bold text-primary dark:text-gold">
        <div className="flex items-center justify-between py-3">
          <dt>{refLabel(portion.from)}</dt>
          <dd>صفحة {ar(portion.fromPage)}</dd>
        </div>
        <div className="gold-divider !my-0" />
        <div className="flex items-center justify-between py-3">
          <dt>إلى {refLabel(portion.to)}</dt>
          <dd>صفحة {ar(portion.toPage)}</dd>
        </div>
      </dl>
    </article>
  );
}

function ProgressBlock() {
  const k = useKhatmah();
  const pct = Math.round(k.progress * 100);
  return (
    <section className="mt-8" aria-labelledby="khatmah-progress-title">
      <div className="flex items-baseline justify-between mb-3">
        <h2 id="khatmah-progress-title" className="text-lg font-bold text-foreground" data-testid="khatmah-progress-title">
          {k.fullPlan ? "الختمة الحالية" : `خطة القراءة من ${juzLabel(k.plan!.startJuz)}`}
        </h2>
        <span className="text-sm font-bold text-muted-foreground">{ar(pct)}٪</span>
      </div>
      <div
        className="relative h-3 rounded-full bg-muted border border-border overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={k.total}
        aria-valuenow={k.completed}
        aria-valuetext={`${ar(k.completed)} من ${awradLabel(k.total)}`}
        data-testid="khatmah-progress"
      >
        <div
          className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-primary to-[hsl(150_38%_34%)] dark:from-gold dark:to-gold-deep transition-[width] duration-500"
          style={{ width: `${Math.max(pct, k.completed > 0 ? 2 : 0)}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link href="/khatmah/portions/previous" className="card press px-4 py-3 flex items-center justify-between" data-testid="previous-portions">
          <span className="text-sm font-bold text-muted-foreground">الأوراد السابقة</span>
          <span className="text-lg font-extrabold text-foreground">{ar(k.completed)}</span>
        </Link>
        <Link href="/khatmah/portions/upcoming" className="card press px-4 py-3 flex items-center justify-between" data-testid="upcoming-portions">
          <span className="text-sm font-bold text-muted-foreground">الأوراد القادمة</span>
          <span className="text-lg font-extrabold text-foreground">{ar(k.upcoming)}</span>
        </Link>
      </div>
    </section>
  );
}

function ContinueReading() {
  const progress = useReadingProgress();
  if (!progress) return null;
  const ref = { surah: progress.lastSurahNumber, ayah: progress.lastVerseNumber };
  return (
    <Link
      href={readerHref(ref)}
      className="card press mt-6 flex items-center gap-4 px-5 py-4"
      data-testid="continue-reading"
    >
      <span className="list-row__icon !w-11 !h-11 !rounded-2xl" aria-hidden="true">
        <Icon name="book" size={22} strokeWidth={2} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-bold text-muted-foreground">متابعة القراءة من آخر موضع</span>
        <span className="block text-base font-bold text-foreground truncate">
          سورة {progress.lastSurahName}، آية {ar(progress.lastVerseNumber)}
        </span>
        <span className="block text-xs text-muted-foreground">صفحة {ar(progress.lastPageNumber)}</span>
      </span>
      <Icon name="chevronEnd" size={20} className="text-muted-foreground" />
    </Link>
  );
}

function StartKhatmah() {
  return (
    <div className="card card--raised overflow-hidden text-center px-6 pt-6 pb-6" data-testid="khatmah-empty">
      <div className="mx-auto mb-2 w-[132px] h-[132px] rounded-[32px] grid place-items-center bg-gradient-to-b from-[hsl(152_42%_22%)] to-[hsl(156_44%_12%)] shadow-[var(--elev-2)]">
        <FeatureArt name="khatmah" size={108} />
      </div>
      <h2 className="text-xl font-extrabold text-foreground mt-3">ابدأ ختمتك مع مصحفك</h2>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
        قسّم المصحف إلى أوراد يومية، وتابع ورد اليوم، وسجّل ما أتممته حتى تختم القرآن الكريم.
      </p>
      <Link href="/khatmah/new" className="btn btn-primary w-full mt-5" data-testid="start-khatmah">
        <Icon name="plus" size={20} strokeWidth={2.2} />
        بدء ختمة جديدة
      </Link>
    </div>
  );
}

function FinishedKhatmah() {
  const k = useKhatmah();
  const last = k.history.at(-1);
  return (
    <div className="card card--raised text-center px-6 py-7" data-testid="khatmah-finished">
      <div className="mx-auto w-16 h-16 rounded-full grid place-items-center btn-gold">
        <Icon name="check" size={32} strokeWidth={2.4} />
      </div>
      <h2 className="text-xl font-extrabold text-foreground mt-4">{k.fullPlan ? "أتممت الختمة" : "أتممت خطة القراءة"}</h2>
      {last && <p className="text-sm text-muted-foreground mt-1">في {shortDate(last.completedAt)}</p>}
      <p className="text-sm text-muted-foreground mt-3">
        {k.fullPlan
          ? "تقبّل الله منك. يمكنك بدء ختمة جديدة متى شئت."
          : `قرأت من ${juzLabel(k.plan!.startJuz)} إلى آخر المصحف. تُسجّل خطة قراءة مكتملة، ولا تُحسب ختمة كاملة لأنها لم تبدأ من أول المصحف.`}
      </p>
      <div className="grid grid-cols-2 gap-3 mt-5">
        <Link href="/khatmah/new" className="btn btn-primary">
          ختمة جديدة
        </Link>
        <button type="button" className="btn btn-soft" onClick={undoLastPortion}>
          تراجع
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const k = useKhatmah();
  const progress = useReadingProgress();
  const [, navigate] = useLocation();

  const continueHref = (() => {
    if (!k.current) return "/mushaf";
    // Resume inside the wird when the last reading position is within it.
    const last = progress ? { surah: progress.lastSurahNumber, ayah: progress.lastVerseNumber } : null;
    const at = last && isWithin(k.current, last) && compareAyah(last, k.current.from) > 0 ? last : k.current.from;
    return readerHref(at, { wird: true });
  })();

  const finish = () => {
    if (!k.current) return;
    const done = k.current.index;
    completeCurrentPortion();
    hapticSuccess();
    const last = k.completed + 1 === k.total;
    const doneText = k.fullPlan ? "أتممت الختمة، تقبّل الله منك" : "أتممت خطة القراءة، تقبّل الله منك";
    toast.success(last ? doneText : `تم تسجيل الورد ${ar(done + 1)}`, {
      action: { label: "تراجع", onClick: () => undoLastPortion() },
    });
  };

  const share = () => {
    if (!k.current) return;
    void shareOrCopy({
      title: "ورد اليوم",
      text: `ورد اليوم من ${refLabel(k.current.from)} إلى ${refLabel(k.current.to)} (صفحة ${ar(k.current.fromPage)} – ${ar(k.current.toPage)})`,
    });
  };

  return (
    <Screen
      title="الورد الحالي"
      startActions={[
        { label: "الفواصل", icon: <Icon name="bookmark" size={24} />, onClick: () => navigate("/bookmarks"), testId: "header-bookmarks" },
      ]}
      endActions={
        k.current
          ? [{ label: "مشاركة الورد", icon: <Icon name="share" size={24} />, onClick: share, testId: "header-share" }]
          : []
      }
    >
      <div className="screen__inner px-4 pt-5 pb-8 page-enter">
        {!k.plan && <StartKhatmah />}
        {k.plan && k.finished && <FinishedKhatmah />}
        {k.current && (
          <>
            <WirdCard portion={k.current} />
            <div className="grid grid-cols-[1.25fr_1fr] gap-3 mt-5">
              <Link href={continueHref} className="btn btn-primary" data-testid="continue-wird">
                تابع قراءة الورد
              </Link>
              <button type="button" className="btn btn-gold whitespace-nowrap !px-3" onClick={finish} data-testid="finish-wird">
                أتممت القراءة
                <Icon name="check" size={20} strokeWidth={2.4} />
              </button>
            </div>
          </>
        )}
        {k.plan && <ProgressBlock />}
        <ContinueReading />
      </div>
    </Screen>
  );
}
