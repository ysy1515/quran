import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearch } from "wouter";
import { toast } from "sonner";
import { useGetSurahVerses, getGetSurahVersesQueryKey, type Verse } from "@workspace/api-client-react";
import {
  SURAH_COUNT,
  ayahCount,
  compareAyah,
  isValidSurah,
  juzOfAyah,
  pageOfAyah,
  shouldShowBasmalahHeader,
  surahName,
} from "@workspace/quran-meta";
import Screen from "@/components/shell/Screen";
import Sheet from "@/components/kit/Sheet";
import { Segmented } from "@/components/kit/List";
import { Icon, type IconName } from "@/components/icons/Icon";
import { setChromeHidden, useChromeHidden } from "@/components/shell/chrome";
import TafsirPanel from "@/components/TafsirPanel";
import { FONT_SIZE_MAX, FONT_SIZE_MIN, recordProgress, useReaderSettings, useReadingStop } from "@/lib/userData";
import { toggleBookmark, toggleFavorite, useBookmarks, useFavorites } from "@/lib/bookmarks";
import { completeCurrentPortion, undoLastPortion, useKhatmah } from "@/lib/khatmah";
import { addReadingSeconds } from "@/lib/readingTime";
import { copyToClipboard, formatAyahForCopy } from "@/lib/clipboard";
import { shareOrCopy } from "@/lib/share";
import { hapticSuccess, hapticTap } from "@/lib/haptics";
import { ar, juzLabel } from "@/lib/format";
import { readerHref } from "@/lib/useQuranLinks";

/** Counts visible time on this screen into the reading-time statistic. */
function useReadingTimer() {
  useEffect(() => {
    let last = Date.now();
    const flush = () => {
      const now = Date.now();
      if (document.visibilityState === "visible") addReadingSeconds((now - last) / 1000);
      last = now;
    };
    const t = setInterval(flush, 30000);
    const onVis = () => {
      if (document.visibilityState === "hidden") flush();
      else last = Date.now();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      flush();
    };
  }, []);
}

function ActionButton({ icon, label, onClick, active, testId }: {
  icon: IconName;
  label: string;
  onClick: () => void;
  active?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-center justify-center gap-1.5 min-h-[72px] rounded-2xl text-[0.8rem] font-bold transition-colors active:scale-95 ${
        active ? "bg-primary text-primary-foreground dark:bg-gold dark:text-[hsl(156_40%_8%)]" : "bg-muted text-foreground"
      }`}
      data-testid={testId}
    >
      <Icon name={icon} size={22} filled={active} />
      {label}
    </button>
  );
}

export default function Mushaf() {
  const params = useParams<{ surah?: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const parsed = parseInt(params.surah ?? "1", 10);
  const surahNumber = isValidSurah(parsed) ? parsed : 1;
  const query = new URLSearchParams(search);
  const targetAyah = parseInt(query.get("ayah") ?? "", 10);
  const wirdMode = query.get("wird") === "1";

  const { settings, setFontSize } = useReaderSettings();
  const fontSize = settings.fontSize;
  const [showTranslation, setShowTranslation] = useState(false);
  const [actionVerse, setActionVerse] = useState<Verse | null>(null);
  const [tafsirVerse, setTafsirVerse] = useState<Verse | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [visibleAyah, setVisibleAyah] = useState(Number.isFinite(targetAyah) ? targetAyah : 1);
  const [flash, setFlash] = useState<number | null>(null);
  const focus = useChromeHidden();
  const body = useRef<HTMLElement | null>(null);

  const perPage = Math.max(ayahCount(surahNumber), 1);
  const { data, isLoading, isError, refetch } = useGetSurahVerses(
    surahNumber,
    { page: 1, perPage },
    { query: { queryKey: getGetSurahVersesQueryKey(surahNumber, { page: 1, perPage }) } },
  );
  const surah = data?.surah;
  const verses = useMemo(() => (Array.isArray(data?.verses) ? data.verses : []), [data]);
  const name = surah?.name ?? surahName(surahNumber);

  const { isStopAt, setStop, clearStop } = useReadingStop();
  const bookmarks = useBookmarks();
  const favorites = useFavorites();
  const khatmah = useKhatmah();
  const wird = wirdMode ? khatmah.current : null;

  useReadingTimer();
  useEffect(() => () => setChromeHidden(false), []);

  // Jump to ?ayah= once the verses are on screen, or start at the top.
  useEffect(() => {
    if (verses.length === 0) return;
    const ayah = Number.isFinite(targetAyah) ? targetAyah : 1;
    const el = body.current?.querySelector<HTMLElement>(`[data-ayah="${ayah}"]`);
    if (el && ayah > 1) {
      el.scrollIntoView({ block: "center" });
      setFlash(ayah);
      const t = setTimeout(() => setFlash(null), 2200);
      return () => clearTimeout(t);
    }
    if (!Number.isFinite(targetAyah)) body.current?.scrollTo({ top: 0 });
    return undefined;
  }, [verses, targetAyah, showTranslation]);

  // Record where the reader is: the ayah at the top of the reading area.
  const record = useCallback(
    (ayah: number) => {
      const v = verses.find((x) => x.verseNumber === ayah);
      recordProgress({
        lastSurahNumber: surahNumber,
        lastVerseNumber: ayah,
        lastPageNumber: v?.pageNumber ?? pageOfAyah(surahNumber, ayah),
        lastSurahName: name,
      });
    },
    [verses, surahNumber, name],
  );

  useEffect(() => {
    if (verses.length > 0) record(Number.isFinite(targetAyah) ? targetAyah : 1);
    // Only when a surah (or target) opens; scrolling records the rest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verses.length > 0, surahNumber, targetAyah]);

  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onScroll = useCallback(
    (el: HTMLElement) => {
      clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const probe = document.elementFromPoint(rect.left + rect.width / 2, rect.top + 56);
        const ayah = parseInt((probe as HTMLElement | null)?.closest<HTMLElement>("[data-ayah]")?.dataset.ayah ?? "", 10);
        if (ayah > 0) {
          setVisibleAyah(ayah);
          record(ayah);
        }
      }, 450);
    },
    [record],
  );

  const toggleStop = (v: Verse) => {
    if (isStopAt(surahNumber, v.verseNumber)) {
      clearStop();
      toast.success("تمت إزالة موضع التوقف");
    } else {
      setStop({ surahNumber, verseNumber: v.verseNumber, pageNumber: v.pageNumber, surahName: name });
      toast.success("تم حفظ موضع التوقف");
    }
    hapticTap();
  };

  const toggleBm = (v: Verse) => {
    const on = toggleBookmark({ surahNumber, verseNumber: v.verseNumber, pageNumber: v.pageNumber, surahName: name });
    toast.success(on ? "تمت إضافة فاصل" : "تمت إزالة الفاصل");
    hapticTap();
  };

  const toggleFav = (v: Verse) => {
    const on = toggleFavorite({ surahNumber, verseNumber: v.verseNumber, pageNumber: v.pageNumber, surahName: name, text: v.text });
    toast.success(on ? "أُضيفت الآية إلى المفضلة" : "أُزيلت الآية من المفضلة");
    hapticTap();
  };

  const finishWird = () => {
    if (!khatmah.current) return;
    const n = khatmah.current.index + 1;
    completeCurrentPortion();
    hapticSuccess();
    toast.success(`تم تسجيل الورد ${ar(n)}`, { action: { label: "تراجع", onClick: () => undoLastPortion() } });
    navigate("/", { replace: true });
  };

  const page = verses.find((v) => v.verseNumber === visibleAyah)?.pageNumber ?? pageOfAyah(surahNumber, visibleAyah);
  const wirdEndsHere = wird && wird.to.surah === surahNumber ? wird.to.ayah : null;
  const wirdPassed = wird ? compareAyah({ surah: surahNumber, ayah: visibleAyah }, wird.to) >= 0 : false;

  const verseClass = (n: number) => {
    if (flash === n) return "bg-gold/25 rounded";
    if (isStopAt(surahNumber, n)) return "text-primary dark:text-gold";
    return "";
  };

  const wirdEnd = (
    <div className="card card--raised my-6 px-5 py-4 text-center font-sans" data-testid="wird-end">
      <p className="text-sm font-bold text-primary dark:text-gold">نهاية الورد</p>
      <button type="button" className="btn btn-gold w-full mt-3" onClick={finishWird}>
        أتممت القراءة
        <Icon name="check" size={20} strokeWidth={2.4} />
      </button>
    </div>
  );

  return (
    <Screen
      title={`سورة ${name}`}
      subtitle={`${juzLabel(juzOfAyah(surahNumber, visibleAyah))} · صفحة ${ar(page)}`}
      back="/index"
      endActions={[
        { label: "إعدادات القراءة", icon: <Icon name="textSize" size={24} />, onClick: () => setSettingsOpen(true), testId: "reader-settings" },
        { label: "وضع التركيز", icon: <Icon name="book" size={24} />, onClick: () => setChromeHidden(true), testId: "focus-mode" },
      ]}
      restoreScroll={false}
      onBodyScroll={onScroll}
      bodyRef={(el) => {
        body.current = el;
      }}
    >
      {focus && (
        <button
          type="button"
          onClick={() => setChromeHidden(false)}
          className="fixed z-40 left-3 top-[calc(var(--safe-top)+10px)] h-10 px-4 rounded-full bg-black/55 text-white text-sm font-bold backdrop-blur"
          data-testid="exit-focus"
        >
          إنهاء وضع التركيز
        </button>
      )}

      {wird && (
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-2.5 bg-[hsl(var(--gold)/0.16)] backdrop-blur border-b border-gold/30 text-sm" data-testid="wird-banner">
          <span className="flex-1 min-w-0 font-bold text-foreground truncate">
            الورد {ar(wird.index + 1)}: إلى سورة {surahName(wird.to.surah)} آية {ar(wird.to.ayah)}
          </span>
          {wirdPassed && (
            <button type="button" className="btn btn-gold !min-h-9 !px-3 !text-sm" onClick={finishWird} data-testid="wird-banner-finish">
              أتممت
            </button>
          )}
        </div>
      )}

      <div className="screen__inner px-4 pt-4 pb-10 page-enter">
        <div className="surah-header mb-5">
          <p className="font-quran text-2xl text-foreground mb-1">سورة {name}</p>
          {surah && (
            <p className="text-sm text-muted-foreground">
              {surah.revelationType === "Meccan" ? "مكية" : "مدنية"} · {ar(surah.versesCount)} آية
            </p>
          )}
          {shouldShowBasmalahHeader(surahNumber) && (
            <p className="font-quran text-xl text-primary/80 dark:text-gold/90 mt-3">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
          )}
        </div>

        {isLoading && (
          <div className="space-y-4" aria-label="جاري تحميل الآيات">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton rounded-xl" style={{ height: `${60 + (i % 3) * 20}px` }} />
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center py-16 text-center gap-4" data-testid="reader-error">
            <p className="font-bold text-foreground">تعذّر تحميل الآيات</p>
            <p className="text-sm text-muted-foreground">
              {navigator.onLine ? "تعذّر الاتصال بمصدر بيانات القرآن" : "تحقق من اتصالك بالإنترنت"}
            </p>
            <button type="button" onClick={() => void refetch()} className="btn btn-primary px-8">
              إعادة المحاولة
            </button>
          </div>
        )}

        {verses.length > 0 && !showTranslation && (
          <div className="card px-5 py-6">
            <div
              className="font-quran text-foreground leading-[2.5] text-justify"
              style={{ fontSize: `${fontSize * 1.3}%` }}
              dir="rtl"
              data-testid="mushaf-text"
            >
              {verses.map((v) => (
                <span key={v.id} data-ayah={v.verseNumber}>
                  <span
                    role="button"
                    tabIndex={0}
                    className={`cursor-pointer transition-colors ${verseClass(v.verseNumber)}`}
                    onClick={() => setActionVerse(v)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setActionVerse(v))}
                    aria-label={`الآية ${v.verseNumber}، اضغط لخيارات الآية`}
                  >
                    {v.text}
                  </span>
                  <span className="ayah-mark" aria-hidden="true">
                    {ar(v.verseNumber)}
                  </span>{" "}
                  {wirdEndsHere === v.verseNumber && <span className="block">{wirdEnd}</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {verses.length > 0 && showTranslation && (
          <div className="space-y-3">
            {verses.map((v) => (
              <div key={v.id} data-ayah={v.verseNumber}>
                <button type="button" className={`card w-full px-4 py-4 text-right ${verseClass(v.verseNumber)}`} onClick={() => setActionVerse(v)}>
                  <p className="font-quran text-foreground leading-[2.2]" style={{ fontSize: `${fontSize * 1.2}%` }} dir="rtl">
                    {v.text}
                    <span className="ayah-mark" aria-hidden="true">
                      {ar(v.verseNumber)}
                    </span>
                  </p>
                  {v.translationText && (
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed border-t border-border/60 pt-2 text-left" dir="ltr">
                      {v.translationText}
                    </p>
                  )}
                </button>
                {wirdEndsHere === v.verseNumber && wirdEnd}
              </div>
            ))}
          </div>
        )}

        {verses.length > 0 && (
          <nav className="grid grid-cols-2 gap-3 mt-8" aria-label="التنقل بين السور">
            {surahNumber < SURAH_COUNT ? (
              <Link href={readerHref({ surah: surahNumber + 1, ayah: 1 }, { wird: wirdMode })} className="btn btn-soft">
                <Icon name="chevronStart" size={18} />
                سورة {surahName(surahNumber + 1)}
              </Link>
            ) : (
              <span />
            )}
            {surahNumber > 1 ? (
              <Link href={readerHref({ surah: surahNumber - 1, ayah: 1 }, { wird: wirdMode })} className="btn btn-soft">
                سورة {surahName(surahNumber - 1)}
                <Icon name="chevronEnd" size={18} />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>

      <Sheet open={!!actionVerse} onClose={() => setActionVerse(null)} title={actionVerse ? `سورة ${name} · الآية ${ar(actionVerse.verseNumber)}` : undefined}>
        {actionVerse && (
          <>
            <p className="font-quran text-foreground leading-loose text-lg bg-muted/60 rounded-2xl px-4 py-3 mb-4 max-h-40 overflow-y-auto" dir="rtl">
              {actionVerse.text}
            </p>
            <div className="grid grid-cols-3 gap-2 pb-2" data-testid="ayah-actions">
              <ActionButton
                icon="pin"
                label="موضع التوقف"
                active={isStopAt(surahNumber, actionVerse.verseNumber)}
                onClick={() => toggleStop(actionVerse)}
                testId="action-stop"
              />
              <ActionButton
                icon={bookmarks.has(surahNumber, actionVerse.verseNumber) ? "bookmark" : "bookmarkPlus"}
                label={bookmarks.has(surahNumber, actionVerse.verseNumber) ? "إزالة الفاصل" : "إضافة فاصل"}
                active={bookmarks.has(surahNumber, actionVerse.verseNumber)}
                onClick={() => toggleBm(actionVerse)}
                testId="action-bookmark"
              />
              <ActionButton
                icon="star"
                label={favorites.has(surahNumber, actionVerse.verseNumber) ? "في المفضلة" : "إلى المفضلة"}
                active={favorites.has(surahNumber, actionVerse.verseNumber)}
                onClick={() => toggleFav(actionVerse)}
                testId="action-favorite"
              />
              <ActionButton
                icon="tafsir"
                label="التفسير"
                onClick={() => {
                  setTafsirVerse(actionVerse);
                  setActionVerse(null);
                }}
                testId="action-tafsir"
              />
              <ActionButton
                icon="copy"
                label="نسخ"
                onClick={() => {
                  void copyToClipboard(formatAyahForCopy(actionVerse.text, name, actionVerse.verseNumber), "تم نسخ الآية");
                  setActionVerse(null);
                }}
                testId="action-copy"
              />
              <ActionButton
                icon="share"
                label="مشاركة"
                onClick={() => {
                  void shareOrCopy({ title: `سورة ${name}`, text: formatAyahForCopy(actionVerse.text, name, actionVerse.verseNumber) });
                  setActionVerse(null);
                }}
                testId="action-share"
              />
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="إعدادات القراءة">
        <div className="space-y-5 pb-3">
          <Segmented
            label="طريقة العرض"
            value={showTranslation ? "en" : "ar"}
            onChange={(v) => setShowTranslation(v === "en")}
            options={[
              { value: "ar", label: "النص العربي" },
              { value: "en", label: "مع الترجمة" },
            ]}
          />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="font-size" className="font-bold text-foreground">
                حجم الخط
              </label>
              <span className="text-sm text-muted-foreground">{ar(fontSize)}٪</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-quran text-sm" aria-hidden="true">ص</span>
              <input
                id="font-size"
                type="range"
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                step={10}
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                className="flex-1 accent-[hsl(var(--primary))]"
              />
              <span className="font-quran text-2xl" aria-hidden="true">ص</span>
            </div>
          </div>
        </div>
      </Sheet>

      {tafsirVerse && (
        <TafsirPanel
          open={!!tafsirVerse}
          onClose={() => setTafsirVerse(null)}
          surahNumber={surahNumber}
          verseNumber={tafsirVerse.verseNumber}
          surahName={name}
          verseText={tafsirVerse.text}
          translationText={tafsirVerse.translationText}
          isBookmarked={isStopAt(surahNumber, tafsirVerse.verseNumber)}
          onBookmark={() => toggleStop(tafsirVerse)}
        />
      )}
    </Screen>
  );
}
