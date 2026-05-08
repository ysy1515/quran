import { Link } from "wouter";
import {
  useGetBookmarks,
  getGetBookmarksQueryKey,
  useDeleteBookmark,
} from "@workspace/api-client-react";
import { toast } from "sonner";

export default function Bookmarks() {
  const { data: bookmarks, isLoading } = useGetBookmarks({
    query: { queryKey: getGetBookmarksQueryKey() },
  });

  const deleteBookmark = useDeleteBookmark();

  const handleDelete = (id: number) => {
    deleteBookmark.mutate(
      { id },
      { onSuccess: () => toast.success("تمت إزالة العلامة") }
    );
  };

  // Sort: most recent first
  const sorted = bookmarks ? [...bookmarks].sort((a, b) => b.id - a.id) : [];
  const lastBookmark = sorted[0];

  return (
    <div className="page-enter max-w-2xl mx-auto px-4 py-6" dir="rtl">
      <h1 className="font-quran text-2xl font-bold text-foreground mb-2 text-center">
        العلامات المرجعية
      </h1>
      <p className="text-center text-sm text-muted-foreground mb-6">
        علامات توقفك في القراءة
      </p>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className="w-8 h-8 text-muted-foreground">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
          </div>
          <p className="font-medium text-foreground mb-1">لا توجد علامات بعد</p>
          <p className="text-sm text-muted-foreground mb-5">
            اضغط على أي آية أثناء القراءة ثم اختر «ضع علامة هنا»
          </p>
          <Link
            href="/mushaf"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
            </svg>
            ابدأ القراءة
          </Link>
        </div>
      )}

      {sorted.length > 0 && (
        <>
          {/* Last reading position — prominent card */}
          {lastBookmark && (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-primary">آخر موضع توقفت عنده</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-quran text-lg font-bold text-foreground">{lastBookmark.surahName}</p>
                  <p className="text-sm text-muted-foreground">الآية {lastBookmark.verseNumber} • صفحة {lastBookmark.pageNumber}</p>
                </div>
                <Link
                  href={`/mushaf/${lastBookmark.surahNumber}`}
                  className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity active:scale-95"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 rotate-180">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  أكمل
                </Link>
              </div>
            </div>
          )}

          {/* All bookmarks list */}
          {sorted.length > 1 && (
            <>
              <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                جميع العلامات ({sorted.length})
              </p>
              <div className="space-y-2">
                {sorted.map((bookmark, index) => (
                  <div
                    key={bookmark.id}
                    className={`bg-card border rounded-xl p-4 transition-colors ${
                      index === 0 ? "border-primary/20" : "border-border hover:border-primary/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-muted-foreground" style={{ direction: "ltr" }}>
                          {bookmark.surahNumber}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-quran text-sm font-bold text-foreground">{bookmark.surahName}</span>
                          {index === 0 && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">الأخير</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">الآية {bookmark.verseNumber} • ص {bookmark.pageNumber}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                          href={`/mushaf/${bookmark.surahNumber}`}
                          className="px-2.5 py-1.5 rounded-lg bg-muted text-foreground text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          اذهب
                        </Link>
                        <button
                          onClick={() => handleDelete(bookmark.id)}
                          className="w-7 h-7 rounded-lg hover:bg-destructive/10 transition-colors flex items-center justify-center text-muted-foreground hover:text-destructive"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3.5 h-3.5">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
