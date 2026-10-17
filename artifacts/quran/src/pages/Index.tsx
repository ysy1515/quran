import { useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useListSurahs, getListSurahsQueryKey } from "@workspace/api-client-react";
import {
  JUZ_COUNT,
  SURAH_COUNT,
  ayahCount,
  juzStart,
  pageOfAyah,
  surahName,
} from "@workspace/quran-meta";
import Screen from "@/components/shell/Screen";
import { Segmented } from "@/components/kit/List";
import { Icon } from "@/components/icons/Icon";
import { ar, ayatLabel, juzLabel } from "@/lib/format";
import { readerHref } from "@/lib/useQuranLinks";

type Tab = "surahs" | "juz";
type Revelation = "all" | "meccan" | "medinan";

/** Surah rows come from bundled metadata, so the index works offline. */
const SURAHS = Array.from({ length: SURAH_COUNT }, (_, i) => {
  const number = i + 1;
  return { number, name: surahName(number), ayahs: ayahCount(number), page: pageOfAyah(number, 1) };
});

const JUZ = Array.from({ length: JUZ_COUNT }, (_, i) => {
  const juz = i + 1;
  const start = juzStart(juz);
  return { juz, start, page: pageOfAyah(start.surah, start.ayah) };
});

function Row({ href, number, title, hint, page, testId }: {
  href: string;
  number: number;
  title: string;
  hint: string;
  page: number;
  testId: string;
}) {
  return (
    <Link href={href} className="list-row list-row--plain" data-testid={testId}>
      <span className="ayah-mark !mx-0 flex-none" aria-hidden="true">
        {ar(number)}
      </span>
      <span className="list-row__body">
        <span className="list-row__label block">{title}</span>
        <span className="list-row__hint block">{hint}</span>
      </span>
      <span className="list-row__value">صفحة {ar(page)}</span>
    </Link>
  );
}

export default function IndexPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const tab: Tab = new URLSearchParams(search).get("tab") === "juz" ? "juz" : "surahs";
  const [revelation, setRevelation] = useState<Revelation>("all");

  // Revelation type is only known from the API; the filter appears once it loads.
  const { data } = useListSurahs({ query: { queryKey: getListSurahsQueryKey() } });
  const revelationOf = useMemo(() => {
    const map = new Map<number, string>();
    if (Array.isArray(data)) for (const s of data) map.set(s.number, s.revelationType);
    return map;
  }, [data]);
  const canFilter = revelationOf.size === SURAH_COUNT;

  const surahs = SURAHS.filter((s) => {
    if (!canFilter || revelation === "all") return true;
    return revelationOf.get(s.number) === (revelation === "meccan" ? "Meccan" : "Medinan");
  });

  const setTab = (t: Tab) => navigate(t === "juz" ? "/index?tab=juz" : "/index", { replace: true });

  return (
    <Screen
      title="الفهرس"
      startActions={[
        { label: "البحث في القرآن", icon: <Icon name="search" size={24} />, onClick: () => navigate("/search"), testId: "index-search" },
      ]}
      headerExtra={
        <div className="px-4 pb-3">
          <Segmented<Tab>
            label="نوع الفهرس"
            value={tab}
            onChange={setTab}
            options={[
              { value: "surahs", label: "السور" },
              { value: "juz", label: "الأجزاء" },
            ]}
          />
        </div>
      }
    >
      <div className="screen__inner pb-8">
        {tab === "surahs" ? (
          <>
            {canFilter && (
              <div className="px-4 pt-4">
                <Segmented<Revelation>
                  label="تصفية السور"
                  value={revelation}
                  onChange={setRevelation}
                  options={[
                    { value: "all", label: "الكل" },
                    { value: "meccan", label: "مكية" },
                    { value: "medinan", label: "مدنية" },
                  ]}
                />
              </div>
            )}
            <div className="list-group mt-4" data-testid="surah-list">
              {surahs.map((s) => {
                const rev = revelationOf.get(s.number);
                const revLabel = rev === "Meccan" ? "مكية، " : rev === "Medinan" ? "مدنية، " : "";
                return (
                  <Row
                    key={s.number}
                    href={`/mushaf/${s.number}`}
                    number={s.number}
                    title={`سورة ${s.name}`}
                    hint={`${revLabel}${ayatLabel(s.ayahs)}`}
                    page={s.page}
                    testId={`surah-${s.number}`}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <div className="list-group mt-4" data-testid="juz-list">
            {JUZ.map((j) => (
              <Row
                key={j.juz}
                href={readerHref(j.start)}
                number={j.juz}
                title={juzLabel(j.juz)}
                hint={`يبدأ من سورة ${surahName(j.start.surah)} آية ${ar(j.start.ayah)}`}
                page={j.page}
                testId={`juz-${j.juz}`}
              />
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}
