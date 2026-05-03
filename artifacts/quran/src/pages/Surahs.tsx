import { useState } from "react";
import { Link } from "wouter";
import {
  useListSurahs,
  getListSurahsQueryKey,
} from "@workspace/api-client-react";

export default function Surahs() {
  const [filter, setFilter] = useState<"all" | "meccan" | "medinan">("all");

  const { data: surahs, isLoading } = useListSurahs({
    query: { queryKey: getListSurahsQueryKey() },
  });

  const filtered = surahs?.filter((s) => {
    if (filter === "meccan") return s.revelationType === "Meccan";
    if (filter === "medinan") return s.revelationType === "Medinan";
    return true;
  }) ?? [];

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 py-6" dir="rtl">
      <h1 className="font-quran text-2xl font-bold text-foreground mb-6 text-center">
        سور القرآن الكريم
      </h1>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 bg-muted p-1 rounded-lg">
        {[
          { key: "all", label: "الكل" },
          { key: "meccan", label: "مكية" },
          { key: "medinan", label: "مدنية" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key as typeof filter)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
              filter === t.key
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map((surah) => (
            <Link
              key={surah.id}
              href={`/mushaf/${surah.number}`}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="verse-number text-xs flex-shrink-0">
                {surah.number}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-quran text-base font-bold text-foreground">
                    {surah.name}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    surah.revelationType === "Meccan"
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  }`}>
                    {surah.revelationType === "Meccan" ? "مكية" : "مدنية"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{surah.nameSimple}</span>
                  <span>•</span>
                  <span>{surah.versesCount} آية</span>
                </div>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-muted-foreground rotate-180 flex-shrink-0">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
