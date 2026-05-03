import { Drawer } from "vaul";
import { useGetVerseTafsir, getGetVerseTafsirQueryKey } from "@workspace/api-client-react";

interface TafsirPanelProps {
  open: boolean;
  onClose: () => void;
  surahNumber: number;
  verseNumber: number;
  surahName: string;
  verseText: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

export default function TafsirPanel({
  open,
  onClose,
  surahNumber,
  verseNumber,
  surahName,
  verseText,
}: TafsirPanelProps) {
  const { data, isLoading, isError } = useGetVerseTafsir(
    surahNumber,
    verseNumber,
    { tafsirId: 169 },
    {
      query: {
        enabled: open && surahNumber > 0 && verseNumber > 0,
        queryKey: getGetVerseTafsirQueryKey(surahNumber, verseNumber, { tafsirId: 169 }),
      },
    }
  );

  return (
    <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()} direction="bottom">
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 bg-black/50 z-50 drawer-overlay"
          onClick={onClose}
        />
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
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                  ابن كثير
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="إغلاق"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{surahName}</span>
              <span>•</span>
              <span>الآية {verseNumber}</span>
            </div>

            {/* Verse Text */}
            {verseText && (
              <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                <p className="font-quran text-lg text-foreground leading-loose text-right" dir="rtl">
                  {verseText}
                </p>
              </div>
            )}
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
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-foreground">تعذّر تحميل التفسير</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    تحقق من اتصالك بالإنترنت وحاول مجدداً
                  </p>
                </div>
              </div>
            )}

            {data && (
              <div dir="rtl">
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  تفسير {data.tafsirName}
                </p>
                <div className="prose prose-sm max-w-none text-right">
                  <p className="text-foreground leading-relaxed whitespace-pre-line font-sans text-base">
                    {stripHtml(data.text)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
