import { toast } from "sonner";
import Screen from "@/components/shell/Screen";
import { BrandLockup } from "@/components/brand/Brand";
import { ListSection, ListRow, Switch } from "@/components/kit/List";
import { useKhatmah } from "@/lib/khatmah";
import { useBookmarks, useFavorites } from "@/lib/bookmarks";
import { useReadingProgress } from "@/lib/userData";
import { useReadingTime } from "@/lib/readingTime";
import { REMINDER_TEXT, remindersSupported, setReminder, useReminders, type ReminderId } from "@/lib/reminders";
import { useDhikrState } from "@/lib/dhikr";
import { rateApp, shareApp } from "@/lib/appActions";
import { ayahCount, surahName } from "@workspace/quran-meta";
import { ar, ayatLabel, durationLabel, shortDate } from "@/lib/format";
import { readerHref } from "@/lib/useQuranLinks";

/** The quick list of the last ten surahs from the previous home screen, An-Nas first. */
const SHORT_SURAHS = Array.from({ length: 10 }, (_, i) => 114 - i);

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="badge-count">{children}</span>;
}

function ReminderRow({ id, label, hint }: { id: ReminderId; label: string; hint?: string }) {
  const reminders = useReminders();
  const r = reminders[id];
  const supported = remindersSupported();

  const apply = async (patch: { on?: boolean; time?: string }) => {
    const res = await setReminder(id, patch);
    if (res === "denied") toast.error("لم يتم منح إذن الإشعارات، يرجى السماح من إعدادات الجهاز");
    else if (res === "ok" && patch.on) toast.success(`سيصلك تذكير ${REMINDER_TEXT[id].title} يوميًا`);
  };

  return (
    <div className="list-row list-row--plain" data-testid={`reminder-${id}`}>
      <span className="list-row__body">
        <span className="list-row__label block">{label}</span>
        {hint && <span className="list-row__hint block">{hint}</span>}
      </span>
      {r.on && supported && (
        <input
          type="time"
          value={r.time}
          onChange={(e) => e.target.value && void apply({ time: e.target.value })}
          className="time-value"
          aria-label={`وقت ${label}`}
          dir="ltr"
        />
      )}
      <Switch checked={r.on && supported} onChange={(v) => void apply({ on: v })} label={label} disabled={!supported} />
    </div>
  );
}

export default function More() {
  const k = useKhatmah();
  const bookmarks = useBookmarks();
  const favorites = useFavorites();
  const progress = useReadingProgress();
  const readingTime = useReadingTime();
  const dhikr = useDhikrState();
  const supported = remindersSupported();
  const { fullCount, partialCount, lastFull } = k.stats;
  const webNote = supported ? undefined : "التذكيرات اليومية متاحة في تطبيق الآيفون.";

  return (
    <Screen title="المزيد">
      <div className="screen__inner pb-10">
        <ListSection title="الختمة">
          <ListRow
            icon="book"
            gold
            href="/"
            label={k.plan && !k.fullPlan ? "خطة القراءة الحالية" : "الختمة الحالية"}
            hint={k.plan ? (k.finished ? "مكتملة" : `الورد ${ar(k.completed + 1)} من ${ar(k.total)}`) : "لا توجد ختمة حالية"}
            value={k.plan ? <Badge>{ar(Math.round(k.progress * 100))}٪</Badge> : undefined}
            testId="more-khatmah"
          />
          <ListRow icon="plus" href="/khatmah/new" label="بدء ختمة جديدة" testId="more-new-khatmah" />
        </ListSection>

        <ListSection title="المصحف">
          <ListRow icon="bookmark" href="/bookmarks" label="الفواصل" value={bookmarks.list.length ? <Badge>{ar(bookmarks.list.length)}</Badge> : undefined} testId="more-bookmarks" />
          <ListRow icon="star" href="/favorites" label="آيات مفضلة" value={favorites.list.length ? <Badge>{ar(favorites.list.length)}</Badge> : undefined} testId="more-favorites" />
          <ListRow icon="tafsir" href="/tafsir-translations" label="التفسير والترجمات" />
          <ListRow icon="search" href="/search" label="البحث في السور" />
        </ListSection>

        <ListSection title="سنن قرآنية">
          <ListRow icon="book" href={readerHref({ surah: 18, ayah: 1 })} label="سورة الكهف" hint="يُستحب قراءتها يوم الجمعة" />
          <ListRow icon="moon" href={readerHref({ surah: 67, ayah: 1 })} label="سورة الملك" hint="قبل النوم" />
          <ListRow icon="book" href={readerHref({ surah: 2, ayah: 1 })} label="سورة البقرة" />
        </ListSection>

        <ListSection title="قصار السور">
          {SHORT_SURAHS.map((n) => (
            <ListRow key={n} href={`/mushaf/${n}`} label={`سورة ${surahName(n)}`} value={ayatLabel(ayahCount(n))} testId={`short-surah-${n}`} />
          ))}
        </ListSection>

        <ListSection title="التذكيرات" footer={webNote}>
          <ReminderRow id="wird" label="تذكير الورد اليومي" />
          <ReminderRow id="morning" label="أذكار الصباح" />
          <ReminderRow id="evening" label="أذكار المساء" />
          <ReminderRow id="mulk" label="سورة الملك" hint="تذكير يومي قبل النوم" />
          <ReminderRow id="baqarah" label="سورة البقرة" />
        </ListSection>

        <ListSection title="الإعدادات">
          <ListRow icon="palette" href="/settings" label="المظهر والقراءة" hint="الوضع الليلي، حجم الخط، التفسير" />
          <ListRow icon="mosque" href="/adhan/settings" label="إعدادات الأذان" hint="الموقع، الصوت، طريقة الحساب" />
          <ListRow icon="beads" href="/dhikr" label="التسبيح" value={dhikr.count ? <Badge>{ar(dhikr.count)}</Badge> : undefined} />
        </ListSection>

        <ListSection title="الإحصائيات">
          <ListRow icon="checkCircle" label="الختمات المكتملة" hint="من أول المصحف إلى آخره" value={ar(fullCount)} testId="stat-khatmas" />
          {partialCount > 0 && (
            <ListRow icon="book" label="خطط القراءة المكتملة" hint="بدأت من جزء بعد الأول" value={ar(partialCount)} testId="stat-partial-plans" />
          )}
          <ListRow icon="calendar" label="آخر ختمة" value={lastFull ? shortDate(lastFull.completedAt) : "لا يوجد"} />
          <ListRow
            icon="clock"
            label="الوقت المستغرق في المصحف"
            hint={readingTime ? `منذ ${shortDate(readingTime.since)}` : undefined}
            value={durationLabel(readingTime?.seconds ?? 0)}
            testId="stat-time"
          />
          <ListRow
            icon="pin"
            label="آخر موضع قراءة"
            hint={progress ? `صفحة ${ar(progress.lastPageNumber)}` : undefined}
            value={progress ? `${progress.lastSurahName} ${ar(progress.lastVerseNumber)}` : "لا يوجد"}
            href={progress ? readerHref({ surah: progress.lastSurahNumber, ayah: progress.lastVerseNumber }) : undefined}
          />
        </ListSection>

        <ListSection title="التطبيق">
          <ListRow icon="info" href="/about" label="عن مصحفك" />
          <ListRow icon="share" onClick={() => void shareApp()} label="مشاركة التطبيق" hint="شارك رابط التطبيق مع أصدقائك" />
          <ListRow icon="rateStar" onClick={rateApp} label="تقييم التطبيق" hint="دعمك يساعدنا على التطوير" />
        </ListSection>

        <div className="flex justify-center pt-8 pb-2 text-muted-foreground">
          <BrandLockup size={40} tone="green" />
        </div>
      </div>
    </Screen>
  );
}
