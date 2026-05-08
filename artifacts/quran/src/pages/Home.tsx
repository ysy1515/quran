import { Link } from "wouter";
import {
  useGetReadingProgress,
  getGetReadingProgressQueryKey,
  useGetReadingStats,
  getGetReadingStatsQueryKey,
  useListSurahs,
  getListSurahsQueryKey,
} from "@workspace/api-client-react";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card rounded-xl p-4 border border-border text-center">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function QuickSurah({ number, name, versesCount }: { number: number; name: string; versesCount: number }) {
  return (
    <Link
      href={`/mushaf/${number}`}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer border border-transparent hover:border-border"
    >
      <div className="verse-number text-xs">{number}</div>
      <div className="flex-1 min-w-0">
        <div className="font-quran text-base text-foreground">{name}</div>
        <div className="text-xs text-muted-foreground">{versesCount} آية</div>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-muted-foreground rotate-180">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

export default function Home() {
  const { data: progress } = useGetReadingProgress({
    query: { queryKey: getGetReadingProgressQueryKey() },
  });

  const { data: stats } = useGetReadingStats({
    query: { queryKey: getGetReadingStatsQueryKey() },
  });

  const { data: surahs } = useListSurahs({
    query: { queryKey: getListSurahsQueryKey() },
  });

  const shortSurahs = surahs?.slice(-10).reverse() ?? [];

  return (
    <div className="page-enter max-w-2xl mx-auto px-4 py-8" dir="rtl">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4 border border-primary/20">
          <span className="font-quran text-3xl text-primary">بسم</span>
        </div>
        <h1 className="font-quran text-3xl font-bold text-foreground mb-2">
          القرآن الكريم
        </h1>
        <p className="text-muted-foreground text-sm">
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
        </p>
        <div className="gold-divider mt-6" />
      </div>

      {/* Continue Reading */}
      {progress && progress.lastPageNumber > 1 && (
        <Link
          href={`/mushaf/${progress.lastSurahNumber}`}
          className="block mb-6 p-4 rounded-xl bg-primary text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80 mb-1">متابعة القراءة</p>
              <p className="font-medium font-quran text-lg">{progress.lastSurahName}</p>
              <p className="text-xs opacity-70 mt-1">صفحة {progress.lastPageNumber}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 rotate-180">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </Link>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-8">
          <StatCard label="الصفحات المقروءة" value={stats.pagesRead} />
          <StatCard label="الأجزاء المكتملة" value={stats.completedJuz} />
        </div>
      )}

      {/* Quick Nav */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <Link
          href="/mushaf"
          className="p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors cursor-pointer text-center"
        >
          <div className="text-primary mb-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-6 h-6 mx-auto">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
          </div>
          <p className="font-medium text-sm text-foreground">المصحف</p>
        </Link>
        <Link
          href="/surahs"
          className="p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors cursor-pointer text-center"
        >
          <div className="text-primary mb-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-6 h-6 mx-auto">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>
          <p className="font-medium text-sm text-foreground">السور</p>
        </Link>
        <Link
          href="/search"
          className="p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors cursor-pointer text-center"
        >
          <div className="text-primary mb-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-6 h-6 mx-auto">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <p className="font-medium text-sm text-foreground">البحث</p>
        </Link>
        <Link
          href="/bookmarks"
          className="p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-colors cursor-pointer text-center"
        >
          <div className="text-primary mb-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-6 h-6 mx-auto">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
          </div>
          <p className="font-medium text-sm text-foreground">العلامات</p>
        </Link>
      </div>

      {/* Short Surahs */}
      {shortSurahs.length > 0 && (
        <div>
          <h2 className="font-medium text-sm text-muted-foreground mb-3">قصار السور</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {shortSurahs.map((s, i) => (
              <div key={s.id}>
                <QuickSurah number={s.number} name={s.name} versesCount={s.versesCount} />
                {i < shortSurahs.length - 1 && <div className="h-px bg-border mx-4" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
