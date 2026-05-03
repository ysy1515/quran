import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  useSearchQuran,
  getSearchQuranQueryKey,
} from "@workspace/api-client-react";

export default function Search() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading } = useSearchQuran(
    { q: debouncedQuery, language: "ar" },
    {
      query: {
        enabled: debouncedQuery.length > 0,
        queryKey: getSearchQuranQueryKey({ q: debouncedQuery, language: "ar" }),
      },
    }
  );

  return (
    <div className="page-enter max-w-2xl mx-auto px-4 py-6" dir="rtl">
      <h1 className="font-quran text-2xl font-bold text-foreground mb-6 text-center">البحث</h1>

      {/* Search Input */}
      <div className="relative mb-6">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث باسم السورة أو رقمها..."
          className="w-full bg-card border border-border rounded-xl pr-10 pl-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
          style={{ direction: "rtl" }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {!debouncedQuery && (
        <div className="text-center py-16 text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className="w-8 h-8">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <p className="font-medium text-foreground mb-1">ابحث في القرآن الكريم</p>
          <p className="text-sm">أدخل اسم السورة أو رقمها للبحث</p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      )}

      {data && debouncedQuery && (
        <>
          <p className="text-xs text-muted-foreground mb-3">{data.totalCount} نتيجة</p>
          {data.totalCount === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p className="font-medium text-foreground mb-1">لا توجد نتائج</p>
              <p className="text-sm">جرّب كلمة بحث أخرى</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.surahs.map((surah) => (
                <Link
                  key={surah.id}
                  href={`/mushaf/${surah.number}`}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="verse-number text-xs flex-shrink-0">{surah.number}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-quran text-base font-bold text-foreground">{surah.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        surah.revelationType === "Meccan"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      }`}>
                        {surah.revelationType === "Meccan" ? "مكية" : "مدنية"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {surah.nameSimple} • {surah.versesCount} آية
                    </div>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-muted-foreground rotate-180 flex-shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
