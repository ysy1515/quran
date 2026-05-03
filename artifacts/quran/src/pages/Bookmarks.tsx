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
      { onSuccess: () => toast.success("تمت إزالة العلامة المرجعية") }
    );
  };

  return (
    <div className="page-enter max-w-2xl mx-auto px-4 py-6" dir="rtl">
      <h1 className="font-quran text-2xl font-bold text-foreground mb-6 text-center">
        العلامات المرجعية
      </h1>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && (!bookmarks || bookmarks.length === 0) && (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className="w-8 h-8 text-muted-foreground">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
          </div>
          <p className="font-medium text-foreground mb-1">لا توجد علامات مرجعية</p>
          <p className="text-sm text-muted-foreground mb-4">
            اضغط على أيقونة العلامة بجانب أي آية لحفظها هنا
          </p>
          <Link
            href="/mushaf"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            ابدأ القراءة
          </Link>
        </div>
      )}

      {bookmarks && bookmarks.length > 0 && (
        <div className="space-y-2">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/20 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-quran text-base font-bold text-foreground">{bookmark.surahName}</span>
                    <span className="text-xs text-muted-foreground">آية {bookmark.verseNumber}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">صفحة {bookmark.pageNumber}</p>
                  {bookmark.note && (
                    <p className="text-sm text-foreground mt-1 bg-muted rounded px-2 py-1">{bookmark.note}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/mushaf/${bookmark.surahNumber}`}
                    className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
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
                      <path d="M10 11v6" /><path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
