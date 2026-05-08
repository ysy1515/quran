import { useState, useEffect } from "react";
import { Drawer } from "vaul";
import { useGetVerseTafsir, getGetVerseTafsirQueryKey } from "@workspace/api-client-react";
import { copyToClipboard, formatAyahForCopy } from "@/lib/clipboard";

interface TafsirPanelProps {
  open: boolean;
  onClose: () => void;
  surahNumber: number;
  verseNumber: number;
  surahName: string;
  verseText: string;
  translationText?: string | null;
  isBookmarked?: boolean;
  onBookmark?: () => void;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

const TAFSIR_AR = 14;
const TAFSIR_EN = 169;

const CONCISE_CHARS = 380;

function getConciseTafsir(text: string): { preview: string; isTruncated: boolean } {
  if (text.length <= CONCISE_CHARS) return { preview: text, isTruncated: false };
  // Cut at last Arabic sentence boundary before limit
  const slice = text.slice(0, CONCISE_CHARS);
  const lastDot = Math.max(
    slice.lastIndexOf(".\n"),
    slice.lastIndexOf(".\r"),
    slice.lastIndexOf(". "),
    slice.lastIndexOf("،"),
    slice.lastIndexOf("\n"),
  );
  const cutAt = lastDot > 150 ? lastDot + 1 : slice.lastIndexOf(" ");
  return { preview: text.slice(0, Math.max(cutAt, 100)).trimEnd() + "…", isTruncated: true };
}

export default function TafsirPanel({
  open,
  onClose,
  surahNumber,
  verseNumber,
  surahName,
  verseText,
  translationText,
  isBookmarked = false,
  onBookmark,
}: TafsirPanelProps) {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [showFull, setShowFull] = useState(false);

  // Reset to concise view whenever a different verse is opened
  useEffect(() => { setShowFull(false); }, [surahNumber, verseNumber]);

  const activeTafsirId = lang === "ar" ? TAFSIR_AR : TAFSIR_EN;

  const { data, isLoading, isError } = useGetVerseTafsir(
    surahNumber,
    verseNumber,
    { tafsirId: activeTafsirId },
    {
      query: {
        enabled: open && surahNumber > 0 && verseNumber > 0,
        queryKey: getGetVerseTafsirQueryKey(surahNumber, verseNumber, { tafsirId: activeTafsirId }),
      },
    }
  );

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()} direction="bottom">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
        <Drawer.Content className="fixed bottom-0 right-0 left-0 z-50 outline-none max-h-[85vh] flex flex-col rounded-t-2xl bg-card border-t border-border shadow-xl">

          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="px-5 pt-3 pb-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">التفسير</span>

                {/* Language Toggle */}
                <div className="flex items-center bg-muted rounded-lg p-0.5 text-xs font-bold">
                  <button
                    onClick={() => setLang("ar")}
                    className={`px-2.5 py-1 rounded-md transition-all ${lang === "ar" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >عربي</button>
                  <button
                    onClick={() => setLang("en")}
                    className={`px-2.5 py-1 rounded-md transition-all ${lang === "en" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >EN</button>
                </div>

                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lang === "ar" ? "bg-primary/10 text-primary" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"}`}>
                  {lang === "ar" ? "ابن كثير" : "Ibn Kathir"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Bookmark button */}
                {onBookmark && (
                  <button
                    onClick={onBookmark}
                    title={isBookmarked ? "إزالة العلامة" : "ضع علامة على هذه الآية"}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isBookmarked
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.75" className="w-4 h-4">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                    </svg>
                  </button>
                )}

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Verse reference */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{surahName}</span>
              <span>•</span>
              <span>الآية {verseNumber}</span>
              {isBookmarked && (
                <span className="text-primary text-xs bg-primary/10 px-2 py-0.5 rounded-full">مُعلَّمة ✓</span>
              )}
            </div>

            {/* Verse texts */}
            <div className="mt-3 space-y-2">
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex items-center justify-end mb-1">
                  <button
                    onClick={() => copyToClipboard(formatAyahForCopy(verseText, surahName, verseNumber), "تم نسخ الآية")}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors px-2 py-0.5 rounded-md hover:bg-primary/10"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3 h-3">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    نسخ الآية
                  </button>
                </div>
                <p className="font-quran text-lg text-foreground leading-loose text-right" dir="rtl">{verseText}</p>
              </div>
              {translationText && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50">
                  <div className="flex items-center justify-start mb-1">
                    <button
                      onClick={() => copyToClipboard(translationText, "تم نسخ الترجمة")}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 dark:text-blue-400 transition-colors px-2 py-0.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3 h-3">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                      Copy translation
                    </button>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed" dir="ltr" style={{ textAlign: "left" }}>{translationText}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tafsir Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {isLoading && (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton h-4 rounded-md" style={{ width: `${85 + (i % 3) * 5}%` }} />
                ))}
              </div>
            )}

            {isError && (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-destructive">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p className="font-medium text-foreground">{lang === "ar" ? "تعذّر تحميل التفسير" : "Failed to load tafsir"}</p>
                <p className="text-sm text-muted-foreground">{lang === "ar" ? "تحقق من اتصالك بالإنترنت" : "Check your internet connection"}</p>
              </div>
            )}

            {data && (() => {
              const fullText = stripHtml(data.text);
              const { preview, isTruncated } = getConciseTafsir(fullText);
              return (
                <div dir={lang === "ar" ? "rtl" : "ltr"}>
                  <div className={`flex items-center justify-between mb-3 ${lang === "en" ? "flex-row-reverse" : ""}`}>
                    <p className="text-sm font-medium text-muted-foreground">
                      {lang === "ar"
                        ? showFull ? `تفسير ${data.tafsirName} (كامل)` : "تفسير مختصر"
                        : showFull ? `Tafsir: ${data.tafsirName} (full)` : "Summary"}
                    </p>
                    {isTruncated && (
                      <button
                        onClick={() => setShowFull((v) => !v)}
                        className="text-xs text-primary hover:underline font-medium px-2 py-0.5 rounded-lg hover:bg-primary/10 transition-colors"
                      >
                        {showFull
                          ? (lang === "ar" ? "تقليص" : "Collapse")
                          : (lang === "ar" ? "عرض التفسير الكامل" : "Show full tafsir")}
                      </button>
                    )}
                  </div>
                  <p className={`text-foreground leading-relaxed whitespace-pre-line font-sans text-base ${lang === "ar" ? "text-right" : "text-left"}`}>
                    {showFull ? fullText : preview}
                  </p>
                  {isTruncated && !showFull && (
                    <button
                      onClick={() => setShowFull(true)}
                      className="mt-4 w-full py-2.5 rounded-xl border border-primary/30 text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
                    >
                      {lang === "ar" ? "عرض التفسير الكامل" : "Show full tafsir"}
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
