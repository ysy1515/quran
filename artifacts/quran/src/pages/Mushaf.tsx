import { useState, useEffect } from "react";
import { useParams } from "wouter";
import {
  useGetSurahVerses,
  getGetSurahVersesQueryKey,
  useListSurahs,
  getListSurahsQueryKey,
  useUpdateReadingProgress,
  useCreateBookmark,
  useGetBookmarks,
  getGetBookmarksQueryKey,
  useDeleteBookmark,
  useGetSettings,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import TafsirPanel from "@/components/TafsirPanel";
import { toast } from "sonner";

interface SelectedVerse {
  surahNumber: number;
  verseNumber: number;
  surahName: string;
  verseText: string;
  translationText?: string | null;
}

export default function Mushaf() {
  const params = useParams<{ surah?: string }>();
  const surahParam = parseInt(params.surah ?? "1", 10);
  const [surahNumber, setSurahNumber] = useState(isNaN(surahParam) ? 1 : surahParam);
  const [selectedVerse, setSelectedVerse] = useState<SelectedVerse | null>(null);
  const [tafsirOpen, setTafsirOpen] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [showTranslation, setShowTranslation] = useState(false);

  const { data: surahs } = useListSurahs({
    query: { queryKey: getListSurahsQueryKey() },
  });

  const { data: settings } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });

  useEffect(() => {
    if (settings?.fontSize) setFontSize(settings.fontSize);
  }, [settings]);

  const { data: versesData, isLoading, isError } = useGetSurahVerses(
    surahNumber,
    { page: 1, perPage: 286 },
    {
      query: {
        queryKey: getGetSurahVersesQueryKey(surahNumber, { page: 1, perPage: 286 }),
        enabled: surahNumber > 0,
      },
    }
  );

  const { data: bookmarks } = useGetBookmarks({
    query: { queryKey: getGetBookmarksQueryKey() },
  });

  const updateProgress = useUpdateReadingProgress();
  const createBookmark = useCreateBookmark();
  const deleteBookmark = useDeleteBookmark();

  const surah = versesData?.surah;
  const verses = versesData?.verses ?? [];

  useEffect(() => {
    if (surah) {
      updateProgress.mutate({
        lastPageNumber: surah.pageNumber,
        lastSurahNumber: surahNumber,
        lastVerseNumber: 1,
        lastSurahName: surah.name,
      });
    }
  }, [surahNumber, surah?.name]);

  const isBookmarked = (verseNum: number) =>
    bookmarks?.some(
      (b) => b.surahNumber === surahNumber && b.verseNumber === verseNum
    ) ?? false;

  const handleVerseClick = (verse: { verseNumber: number; text: string; translationText?: string | null }) => {
    if (!surah) return;
    setSelectedVerse({
      surahNumber,
      verseNumber: verse.verseNumber,
      surahName: surah.name,
      verseText: verse.text,
      translationText: verse.translationText,
    });
    setTafsirOpen(true);
  };

  const handleBookmark = (e: React.MouseEvent, verse: { verseNumber: number; pageNumber: number }) => {
    e.stopPropagation();
    if (!surah) return;
    const existing = bookmarks?.find(
      (b) => b.surahNumber === surahNumber && b.verseNumber === verse.verseNumber
    );
    if (existing) {
      deleteBookmark.mutate({ id: existing.id }, {
        onSuccess: () => toast.success("تمت إزالة العلامة المرجعية"),
      });
    } else {
      createBookmark.mutate(
        { pageNumber: verse.pageNumber, surahNumber, verseNumber: verse.verseNumber, surahName: surah.name },
        { onSuccess: () => toast.success("تمت إضافة العلامة المرجعية") }
      );
    }
  };

  const prevSurah = () => surahNumber > 1 && setSurahNumber(surahNumber - 1);
  const nextSurah = () => surahNumber < 114 && setSurahNumber(surahNumber + 1);

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 py-6" dir="rtl">
      {/* Top Controls */}
      <div className="flex items-center gap-2 mb-6">
        {/* Surah Selector */}
        <div className="flex-1">
          <select
            value={surahNumber}
            onChange={(e) => setSurahNumber(parseInt(e.target.value, 10))}
            className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm font-medium text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
            style={{ direction: "rtl" }}
          >
            {surahs?.map((s) => (
              <option key={s.id} value={s.number}>
                {s.number}. {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Language Toggle AR / EN */}
        <div className="flex items-center bg-muted rounded-lg p-0.5 text-xs font-bold flex-shrink-0">
          <button
            onClick={() => setShowTranslation(false)}
            className={`px-3 py-1.5 rounded-md transition-all ${
              !showTranslation
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            عربي
          </button>
          <button
            onClick={() => setShowTranslation(true)}
            className={`px-3 py-1.5 rounded-md transition-all ${
              showTranslation
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            EN
          </button>
        </div>

        {/* Font size */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setFontSize(Math.max(80, fontSize - 10))}
            className="w-8 h-8 rounded-lg bg-muted hover:bg-border transition-colors flex items-center justify-center text-xs font-bold text-muted-foreground"
          >
            ص
          </button>
          <button
            onClick={() => setFontSize(Math.min(160, fontSize + 10))}
            className="w-9 h-9 rounded-lg bg-muted hover:bg-border transition-colors flex items-center justify-center font-bold text-muted-foreground"
          >
            ص
          </button>
        </div>
      </div>

      {/* Surah Header */}
      {surah && (
        <div className="surah-header mb-6">
          <p className="font-quran text-2xl font-bold text-foreground mb-1">
            سورة {surah.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {surah.nameSimple} • {surah.nameTranslation} • {surah.revelationType === "Meccan" ? "مكية" : "مدنية"} • {surah.versesCount} آية
          </p>
          {surahNumber !== 9 && (
            <p className="font-quran text-xl text-primary/80 mt-3">
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
            </p>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton rounded-xl" style={{ height: `${60 + (i % 3) * 20}px` }} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center py-20 text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-destructive">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="font-medium text-foreground">تعذّر تحميل الآيات</p>
          <p className="text-sm text-muted-foreground">تحقق من اتصالك بالإنترنت</p>
        </div>
      )}

      {/* Verses — Arabic flowing mode */}
      {verses.length > 0 && !showTranslation && (
        <div className="bg-card rounded-2xl border border-border px-5 py-6 shadow-sm">
          <p
            className="font-quran text-foreground leading-[2.6] text-right"
            style={{ fontSize: `${fontSize}%` }}
            dir="rtl"
          >
            {verses.map((verse) => (
              <span key={verse.id}>
                <span
                  className={`cursor-pointer hover:text-primary transition-colors rounded ${
                    isBookmarked(verse.verseNumber) ? "text-primary" : ""
                  }`}
                  onClick={() => handleVerseClick(verse)}
                >
                  {verse.text}
                </span>
                <span
                  className="inline-flex items-center justify-center mx-1 cursor-pointer align-middle"
                  onClick={() => handleVerseClick(verse)}
                  title={`الآية ${verse.verseNumber}`}
                >
                  <span
                    className="font-sans text-primary/80 hover:text-primary transition-colors select-none"
                    style={{ fontSize: "55%", lineHeight: 1 }}
                  >
                    ﴿{verse.verseNumber}﴾
                  </span>
                </span>
              </span>
            ))}
          </p>
        </div>
      )}

      {/* Verses — EN translation mode (card per verse) */}
      {verses.length > 0 && showTranslation && (
        <div className="space-y-2">
          {verses.map((verse) => (
            <div
              key={verse.id}
              className="verse-item group"
              onClick={() => handleVerseClick(verse)}
            >
              <div className="flex items-start gap-3">
                <div className="verse-number flex-shrink-0 mt-1" style={{ fontSize: "0.65rem" }}>
                  {verse.verseNumber}
                </div>
                <div className="flex-1">
                  <p
                    className="font-quran text-foreground text-right leading-loose"
                    style={{ fontSize: `${fontSize}%` }}
                    dir="rtl"
                  >
                    {verse.text}
                  </p>
                  {verse.translationText && (
                    <p
                      className="text-sm text-muted-foreground mt-2 leading-relaxed border-t border-border/50 pt-2"
                      dir="ltr"
                      style={{ textAlign: "left", fontFamily: "sans-serif" }}
                    >
                      {verse.translationText}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => handleBookmark(e, verse)}
                  className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1 p-1 rounded ${
                    isBookmarked(verse.verseNumber)
                      ? "opacity-100 text-primary"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill={isBookmarked(verse.verseNumber) ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth="1.75"
                    className="w-4 h-4"
                  >
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
        <button
          onClick={nextSurah}
          disabled={surahNumber >= 114}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4 rotate-180">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          السورة التالية
        </button>
        <span className="text-xs text-muted-foreground">{surahNumber} / 114</span>
        <button
          onClick={prevSurah}
          disabled={surahNumber <= 1}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
        >
          السورة السابقة
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Tafsir Panel */}
      {selectedVerse && (
        <TafsirPanel
          open={tafsirOpen}
          onClose={() => setTafsirOpen(false)}
          surahNumber={selectedVerse.surahNumber}
          verseNumber={selectedVerse.verseNumber}
          surahName={selectedVerse.surahName}
          verseText={selectedVerse.verseText}
          translationText={selectedVerse.translationText}
        />
      )}
    </div>
  );
}
