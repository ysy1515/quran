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
      { onSuccess: () => toast.success("تمت إزالة علامة التوقف") }
    );
  };

  // Only the single latest stop matters
  const sorted = bookmarks ? [...bookmarks].sort((a, b) => b.id - a.id) : [];
  const latestStop = sorted[0] ?? null;

  return (
    <div className="page-enter max-w-2xl mx-auto px-4 py-6" dir="rtl">
      <h1 className="font-quran text-2xl font-bold text-foreground mb-2 text-center">
        موضع التوقف
      </h1>
      <p className="text-center text-sm text-muted-foreground mb-6">
        آخر مكان توقفت فيه أثناء القراءة
      </p>

      {isLoading && (
        <div className="skeleton h-44 rounded-2xl" />
      )}

      {!isLoading && !latestStop && (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className="w-8 h-8 text-muted-foreground">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
          </div>
          <p className="font-medium text-foreground mb-1">لا يوجد موضع محفوظ حالياً</p>
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

      {latestStop && (
        <div className="space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">آخر موضع توقفت عنده</span>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-primary">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-quran text-xl font-bold text-foreground">{latestStop.surahName}</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  الآية {latestStop.verseNumber}
                  {latestStop.pageNumber ? ` • صفحة ${latestStop.pageNumber}` : ""}
                </p>
                {latestStop.createdAt && (
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {new Date(latestStop.createdAt).toLocaleDateString("ar-SA", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/mushaf/${latestStop.surahNumber}`}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity active:scale-95"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 rotate-180">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                أكمل القراءة من هنا
              </Link>
              <button
                onClick={() => handleDelete(latestStop.id)}
                className="px-4 py-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors active:scale-95 flex items-center gap-1.5 text-sm font-medium"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                </svg>
                مسح
              </button>
            </div>
          </div>

          <div className="bg-muted/40 rounded-xl px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground leading-relaxed">
              عند إضافة علامة جديدة ستحل محل هذه العلامة تلقائياً
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
