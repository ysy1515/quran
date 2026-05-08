import { Link } from "wouter";
import { useListJuz, getListJuzQueryKey } from "@workspace/api-client-react";

export default function JuzPage() {
  const { data: juzList, isLoading } = useListJuz({
    query: { queryKey: getListJuzQueryKey() },
  });

  return (
    <div className="page-enter max-w-2xl mx-auto px-4 py-6" dir="rtl">
      <h1 className="font-quran text-2xl font-bold text-foreground mb-6 text-center">
        أجزاء القرآن الكريم
      </h1>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      )}

      {juzList && (
        <div className="space-y-2">
          {juzList.map((juz) => {
            const firstSurahEntry = Object.entries(juz.verseMapping ?? {})[0];
            const firstSurahNum = firstSurahEntry ? parseInt(firstSurahEntry[0], 10) : null;
            const firstVerseRange = firstSurahEntry ? firstSurahEntry[1] : null;

            return (
              <div
                key={juz.juzNumber}
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-sm">{juz.juzNumber}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">الجزء {juz.juzNumber}</p>
                    {firstSurahNum && firstVerseRange && typeof firstVerseRange === "string" && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        يبدأ من سورة {firstSurahNum} • آية {firstVerseRange.split("-")[0]}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{juz.versesCount} آية</p>
                  </div>
                  {firstSurahNum && (
                    <Link
                      href={`/mushaf/${firstSurahNum}`}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      اقرأ
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
