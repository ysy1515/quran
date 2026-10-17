import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import Screen from "@/components/shell/Screen";
import { ListSection, ListRow } from "@/components/kit/List";
import { ConfirmSheet } from "@/components/kit/Sheet";
import { Icon } from "@/components/icons/Icon";
import { useReadingStop } from "@/lib/userData";
import { bookmarksStore, removeBookmark, useBookmarks } from "@/lib/bookmarks";
import { ar, shortDate } from "@/lib/format";
import { readerHref } from "@/lib/useQuranLinks";

function RemoveButton({ label, onClick, testId }: { label: string; onClick: () => void; testId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="w-11 h-11 -ml-2 grid place-items-center rounded-full text-muted-foreground active:scale-90"
      data-testid={testId}
    >
      <Icon name="trash" size={20} />
    </button>
  );
}

export default function Bookmarks() {
  const { stop, clearStop } = useReadingStop();
  const { list } = useBookmarks();
  const [confirmAll, setConfirmAll] = useState(false);

  const remove = (s: number, v: number) => {
    const before = bookmarksStore.get();
    removeBookmark(s, v);
    toast.success("تمت إزالة الفاصل", { action: { label: "تراجع", onClick: () => bookmarksStore.set(before) } });
  };

  return (
    <Screen title="الفواصل" back="/more">
      <div className="screen__inner pb-10">
        <ListSection title="موضع التوقف" footer="آخر مكان وضعت عنده علامة التوقف. وضع علامة جديدة يستبدل هذه العلامة.">
          {stop ? (
            <ListRow
              icon="pin"
              gold
              href={readerHref({ surah: stop.surahNumber, ayah: stop.verseNumber })}
              label={`سورة ${stop.surahName} · آية ${ar(stop.verseNumber)}`}
              hint={`صفحة ${ar(stop.pageNumber)} · ${shortDate(stop.createdAt)}`}
              trailing={
                <RemoveButton
                  label="مسح موضع التوقف"
                  onClick={() => {
                    clearStop();
                    toast.success("تمت إزالة علامة التوقف");
                  }}
                  testId="clear-stop"
                />
              }
              testId="reading-stop"
            />
          ) : (
            <ListRow label="لا يوجد موضع محفوظ" hint="اضغط على أي آية أثناء القراءة ثم اختر «موضع التوقف»" />
          )}
        </ListSection>

        <ListSection title={list.length ? `الفواصل (${ar(list.length)})` : "الفواصل"}>
          {list.length === 0 ? (
            <ListRow label="لا توجد فواصل بعد" hint="اضغط على أي آية في المصحف ثم اختر «إضافة فاصل»" />
          ) : (
            list.map((b) => (
              <ListRow
                key={`${b.surahNumber}:${b.verseNumber}`}
                icon="bookmark"
                href={readerHref({ surah: b.surahNumber, ayah: b.verseNumber })}
                label={`سورة ${b.surahName} · آية ${ar(b.verseNumber)}`}
                hint={`صفحة ${ar(b.pageNumber)} · ${shortDate(b.createdAt)}`}
                trailing={<RemoveButton label={`حذف فاصل سورة ${b.surahName} آية ${b.verseNumber}`} onClick={() => remove(b.surahNumber, b.verseNumber)} />}
                testId={`bookmark-${b.surahNumber}-${b.verseNumber}`}
              />
            ))
          )}
        </ListSection>

        {list.length > 1 && (
          <div className="px-4 mt-6">
            <button type="button" className="btn btn-danger w-full" onClick={() => setConfirmAll(true)}>
              حذف جميع الفواصل
            </button>
          </div>
        )}
        {!stop && list.length === 0 && (
          <div className="px-4 mt-8">
            <Link href="/mushaf" className="btn btn-primary w-full">
              ابدأ القراءة
            </Link>
          </div>
        )}
      </div>
      <ConfirmSheet
        open={confirmAll}
        onClose={() => setConfirmAll(false)}
        onConfirm={() => {
          bookmarksStore.set([]);
          toast.success("تم حذف جميع الفواصل");
        }}
        title="حذف جميع الفواصل؟"
        message={`سيتم حذف ${ar(list.length)} فاصلًا. لا يتأثر موضع التوقف.`}
        confirmLabel="حذف الكل"
        danger
      />
    </Screen>
  );
}
