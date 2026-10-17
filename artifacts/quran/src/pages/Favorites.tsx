import { toast } from "sonner";
import { Link } from "wouter";
import Screen from "@/components/shell/Screen";
import { Icon } from "@/components/icons/Icon";
import { favoritesStore, removeFavorite, useFavorites } from "@/lib/bookmarks";
import { ar, shortDate } from "@/lib/format";
import { readerHref } from "@/lib/useQuranLinks";
import { shareOrCopy } from "@/lib/share";
import { copyToClipboard, formatAyahForCopy } from "@/lib/clipboard";

export default function Favorites() {
  const { list } = useFavorites();

  const remove = (s: number, v: number) => {
    const before = favoritesStore.get();
    removeFavorite(s, v);
    toast.success("أُزيلت الآية من المفضلة", { action: { label: "تراجع", onClick: () => favoritesStore.set(before) } });
  };

  return (
    <Screen title="آيات مفضلة" back="/more">
      <div className="screen__inner px-4 pt-4 pb-10 space-y-3">
        {list.length === 0 && (
          <div className="text-center px-4 py-16">
            <p className="font-bold text-foreground mb-1">لا توجد آيات مفضلة بعد</p>
            <p className="text-sm text-muted-foreground mb-6">اضغط على أي آية في المصحف ثم اختر «إضافة إلى المفضلة»</p>
            <Link href="/mushaf" className="btn btn-primary px-8">
              افتح المصحف
            </Link>
          </div>
        )}
        {list.map((f) => {
          const ref = `سورة ${f.surahName} - آية ${ar(f.verseNumber)}`;
          return (
            <article key={`${f.surahNumber}:${f.verseNumber}`} className="card px-4 pt-4 pb-2" data-testid={`favorite-${f.surahNumber}-${f.verseNumber}`}>
              <Link href={readerHref({ surah: f.surahNumber, ayah: f.verseNumber })} className="block">
                <p className="font-quran text-[1.35rem] leading-[2.2] text-foreground text-center" dir="rtl">
                  {f.text}
                  <span className="ayah-mark">{ar(f.verseNumber)}</span>
                </p>
              </Link>
              <div className="flex items-center gap-1 mt-2 border-t border-border/70 pt-1">
                <span className="flex-1 text-sm font-bold text-primary dark:text-gold">
                  {ref}
                  <span className="block text-xs font-normal text-muted-foreground">{shortDate(f.createdAt)}</span>
                </span>
                <button
                  type="button"
                  className="w-11 h-11 grid place-items-center rounded-full text-muted-foreground active:scale-90"
                  aria-label="نسخ الآية"
                  onClick={() => void copyToClipboard(formatAyahForCopy(f.text, f.surahName, f.verseNumber))}
                >
                  <Icon name="copy" size={20} />
                </button>
                <button
                  type="button"
                  className="w-11 h-11 grid place-items-center rounded-full text-muted-foreground active:scale-90"
                  aria-label="مشاركة الآية"
                  onClick={() => void shareOrCopy({ title: ref, text: formatAyahForCopy(f.text, f.surahName, f.verseNumber) })}
                >
                  <Icon name="share" size={20} />
                </button>
                <button
                  type="button"
                  className="w-11 h-11 grid place-items-center rounded-full text-muted-foreground active:scale-90"
                  aria-label="إزالة من المفضلة"
                  onClick={() => remove(f.surahNumber, f.verseNumber)}
                >
                  <Icon name="trash" size={20} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </Screen>
  );
}
