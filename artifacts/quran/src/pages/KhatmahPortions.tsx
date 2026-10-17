import { useMemo } from "react";
import { Link, useParams } from "wouter";
import { surahName } from "@workspace/quran-meta";
import Screen from "@/components/shell/Screen";
import { ListSection, ListRow } from "@/components/kit/List";
import { portionAt, useKhatmah } from "@/lib/khatmah";
import { ar, shortDate } from "@/lib/format";
import { readerHref } from "@/lib/useQuranLinks";

const PAGE_LIMIT = 300;

export default function KhatmahPortions() {
  const { kind } = useParams<{ kind: string }>();
  const previous = kind === "previous";
  const k = useKhatmah();

  const rows = useMemo(() => {
    if (!k.plan) return [];
    const plan = k.plan;
    const indexes = previous
      ? Array.from({ length: k.completed }, (_, i) => k.completed - 1 - i)
      : Array.from({ length: Math.max(k.total - k.completed, 0) }, (_, i) => k.completed + i);
    return indexes.slice(0, PAGE_LIMIT).map((i) => ({ portion: portionAt(plan, i), doneAt: plan.completions[i] }));
  }, [k.plan, k.completed, k.total, previous]);

  return (
    <Screen title={previous ? "الأوراد السابقة" : "الأوراد القادمة"} back="/">
      <div className="screen__inner pb-10">
        {!k.plan && (
          <div className="text-center px-6 py-16">
            <p className="text-muted-foreground mb-5">لا توجد ختمة حالية.</p>
            <Link href="/khatmah/new" className="btn btn-primary">
              بدء ختمة جديدة
            </Link>
          </div>
        )}
        {k.plan && rows.length === 0 && (
          <p className="text-center text-muted-foreground px-6 py-16">
            {previous ? "لم تُتمّ أي ورد في هذه الختمة بعد." : "لا توجد أوراد قادمة."}
          </p>
        )}
        {rows.length > 0 && (
          <ListSection
            title={previous ? `${ar(k.completed)} وردًا مكتملًا` : `${ar(k.total - k.completed)} وردًا متبقيًا`}
            footer={rows.length === PAGE_LIMIT ? `تُعرض أول ${ar(PAGE_LIMIT)} وردًا.` : undefined}
          >
            {rows.map(({ portion: p, doneAt }) => (
              <ListRow
                key={p.index}
                href={readerHref(p.from)}
                label={
                  <>
                    الورد {ar(p.index + 1)}
                    {!previous && p.index === k.completed && (
                      <span className="mr-2 text-xs font-bold px-2 py-0.5 rounded-full bg-gold/20 text-gold-deep">الحالي</span>
                    )}
                  </>
                }
                hint={`من ${surahName(p.from.surah)} ${ar(p.from.ayah)} إلى ${surahName(p.to.surah)} ${ar(p.to.ayah)}`}
                value={previous && doneAt ? shortDate(doneAt) : `ص ${ar(p.fromPage)}`}
              />
            ))}
          </ListSection>
        )}
      </div>
    </Screen>
  );
}
