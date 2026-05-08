import { useState } from "react";
import {
  useListSurahs,
  getListSurahsQueryKey,
  useGetSurahVerses,
  getGetSurahVersesQueryKey,
  useGetVerseTafsir,
  getGetVerseTafsirQueryKey,
} from "@workspace/api-client-react";
import { copyToClipboard, formatAyahForCopy } from "@/lib/clipboard";
import { toast } from "sonner";

const TAFSIR_AR = 14;
const TAFSIR_EN = 169;
const CONCISE_CHARS = 380;

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function getConciseTafsir(text: string): { preview: string; isTruncated: boolean } {
  if (text.length <= CONCISE_CHARS) return { preview: text, isTruncated: false };
  const slice = text.slice(0, CONCISE_CHARS);
  const lastDot = Math.max(
    slice.lastIndexOf(".\n"),
    slice.lastIndexOf(". "),
    slice.lastIndexOf("،"),
    slice.lastIndexOf("\n"),
  );
  const cutAt = lastDot > 150 ? lastDot + 1 : slice.lastIndexOf(" ");
  return { preview: text.slice(0, Math.max(cutAt, 100)).trimEnd() + "…", isTruncated: true };
}

function CopyBtn({ onClick, label = "نسخ" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3.5 h-3.5">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
      </svg>
      {label}
    </button>
  );
}

export default function TafsirPage() {
  const [surahNumber, setSurahNumber] = useState(1);
  const [verseInput, setVerseInput] = useState("1");
  const [activeVerse, setActiveVerse] = useState(1);
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [showFull, setShowFull] = useState(false);

  const { data: surahs } = useListSurahs({ query: { queryKey: getListSurahsQueryKey() } });

  const { data: versesData, isLoading: versesLoading } = useGetSurahVerses(
    surahNumber,
    { page: 1, perPage: 286 },
    { query: { queryKey: getGetSurahVersesQueryKey(surahNumber, { page: 1, perPage: 286 }) } }
  );

  const surah = versesData?.surah;
  const verses = versesData?.verses ?? [];
  const maxVerse = surah?.versesCount ?? 286;

  const verse = verses.find((v) => v.verseNumber === activeVerse);

  const activeTafsirId = lang === "ar" ? TAFSIR_AR : TAFSIR_EN;
  const { data: tafsirData, isLoading: tafsirLoading, isError: tafsirError } = useGetVerseTafsir(
    surahNumber,
    activeVerse,
    { tafsirId: activeTafsirId },
    { query: { queryKey: getGetVerseTafsirQueryKey(surahNumber, activeVerse, { tafsirId: activeTafsirId }) } }
  );

  const handleLoad = () => {
    const n = parseInt(verseInput, 10);
    if (!isNaN(n) && n >= 1 && n <= maxVerse) {
      setActiveVerse(n);
      setShowFull(false);
    } else {
      toast.error(`رقم الآية يجب أن يكون بين ١ و${maxVerse}`);
    }
  };

  const handleSurahChange = (num: number) => {
    setSurahNumber(num);
    setVerseInput("1");
    setActiveVerse(1);
    setShowFull(false);
  };

  const fullTafsirText = tafsirData ? stripHtml(tafsirData.text) : "";
  const { preview, isTruncated } = getConciseTafsir(fullTafsirText);

  return (
    <div className="page-enter max-w-2xl mx-auto px-4 py-6" dir="rtl">
      <div className="text-center mb-6">
        <h1 className="font-quran text-2xl font-bold text-foreground mb-1">التفسير والترجمات</h1>
        <p className="text-sm text-muted-foreground">تفسير ابن كثير مع الترجمة الإنجليزية</p>
      </div>

      {/* Controls */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-5 space-y-3 shadow-sm">
        {/* Surah selector */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">السورة</label>
          <select
            value={surahNumber}
            onChange={(e) => handleSurahChange(parseInt(e.target.value, 10))}
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-medium text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
            style={{ direction: "rtl" }}
          >
            {surahs?.map((s) => (
              <option key={s.id} value={s.number}>
                {s.number}. {s.name} — {s.nameTranslation}
              </option>
            ))}
          </select>
        </div>

        {/* Verse selector */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              رقم الآية {maxVerse > 0 && <span className="text-muted-foreground/60">(من ١ إلى {maxVerse})</span>}
            </label>
            <input
              type="number"
              min={1}
              max={maxVerse}
              value={verseInput}
              onChange={(e) => setVerseInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoad()}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-center"
              dir="ltr"
            />
          </div>
          <div className="flex flex-col justify-end">
            <button
              onClick={handleLoad}
              disabled={versesLoading}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              {versesLoading ? "..." : "عرض"}
            </button>
          </div>
        </div>

        {/* Language toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">التفسير:</span>
          <div className="flex items-center bg-muted rounded-lg p-0.5 text-xs font-bold">
            <button
              onClick={() => { setLang("ar"); setShowFull(false); }}
              className={`px-3 py-1.5 rounded-md transition-all ${lang === "ar" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >عربي</button>
            <button
              onClick={() => { setLang("en"); setShowFull(false); }}
              className={`px-3 py-1.5 rounded-md transition-all ${lang === "en" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >EN</button>
          </div>
        </div>
      </div>

      {/* Verse Display */}
      {verse ? (
        <div className="space-y-4">
          {/* Surah info */}
          {surah && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{surah.name}</span>
              <span>•</span>
              <span>الآية {activeVerse}</span>
              <span>•</span>
              <span className="text-xs">{surah.revelationType === "Meccan" ? "مكية" : "مدنية"}</span>
            </div>
          )}

          {/* Arabic Verse */}
          <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-bold text-xs" dir="ltr">{activeVerse}</span>
              </div>
              <CopyBtn
                onClick={() => copyToClipboard(
                  formatAyahForCopy(verse.text, surah?.name ?? "", activeVerse),
                  "تم نسخ الآية"
                )}
                label="نسخ الآية"
              />
            </div>
            <p className="font-quran text-foreground text-right leading-[2.8] text-xl" dir="rtl">
              {verse.text}
            </p>
          </div>

          {/* Translation */}
          {verse.translationText ? (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">
                  Translation — Sahih International
                </span>
                <CopyBtn
                  onClick={() => copyToClipboard(verse.translationText ?? "", "تم نسخ الترجمة")}
                  label="نسخ الترجمة"
                />
              </div>
              <p className="text-sm text-foreground leading-relaxed" dir="ltr" style={{ textAlign: "left" }}>
                {verse.translationText}
              </p>
            </div>
          ) : (
            <div className="bg-muted/40 border border-border rounded-2xl p-4 text-center">
              <p className="text-sm text-muted-foreground">الترجمات غير متوفرة حالياً</p>
            </div>
          )}

          {/* Tafsir */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {showFull ? `تفسير ${tafsirData?.tafsirName ?? "ابن كثير"} (كامل)` : "تفسير مختصر"}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lang === "ar" ? "bg-primary/10 text-primary" : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"}`}>
                  {lang === "ar" ? "ابن كثير" : "Ibn Kathir"}
                </span>
              </div>
              {fullTafsirText && (
                <CopyBtn
                  onClick={() => copyToClipboard(fullTafsirText, "تم نسخ التفسير")}
                  label="نسخ التفسير"
                />
              )}
            </div>

            {tafsirLoading && (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton h-4 rounded-md" style={{ width: `${80 + (i % 3) * 7}%` }} />
                ))}
              </div>
            )}

            {tafsirError && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  {lang === "ar" ? "لا يتوفر تفسير لهذه الآية حالياً" : "No tafsir available for this verse"}
                </p>
              </div>
            )}

            {tafsirData && fullTafsirText && (
              <div dir={lang === "ar" ? "rtl" : "ltr"}>
                <p className={`text-foreground leading-relaxed whitespace-pre-line font-sans text-base ${lang === "ar" ? "text-right" : "text-left"}`}>
                  {showFull ? fullTafsirText : preview}
                </p>
                {isTruncated && (
                  <button
                    onClick={() => setShowFull((v) => !v)}
                    className="mt-4 w-full py-2.5 rounded-xl border border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
                  >
                    {showFull
                      ? (lang === "ar" ? "إخفاء التفسير الكامل" : "Collapse")
                      : (lang === "ar" ? "عرض التفسير الكامل" : "Show full tafsir")}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        !versesLoading && (
          <div className="text-center py-16 text-muted-foreground text-sm">
            اختر سورة ورقم الآية ثم اضغط «عرض»
          </div>
        )
      )}

      {versesLoading && !verse && (
        <div className="space-y-4">
          <div className="skeleton h-36 rounded-2xl" />
          <div className="skeleton h-20 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      )}
    </div>
  );
}
