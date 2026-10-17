import { useEffect, useState } from "react";
import { useSearchQuran, getSearchQuranQueryKey } from "@workspace/api-client-react";
import Screen from "@/components/shell/Screen";
import { ListRow } from "@/components/kit/List";
import { Icon } from "@/components/icons/Icon";
import { ar } from "@/lib/format";

export default function Search() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isLoading, isError } = useSearchQuran(
    { q: debouncedQuery, language: "ar" },
    {
      query: {
        enabled: debouncedQuery.length > 0,
        queryKey: getSearchQuranQueryKey({ q: debouncedQuery, language: "ar" }),
      },
    },
  );
  const surahs = Array.isArray(data?.surahs) ? data.surahs : [];

  return (
    <Screen
      title="البحث"
      back="/index"
      headerExtra={
        <div className="px-4 pb-3">
          <label className="relative block">
            <span className="sr-only">ابحث باسم السورة أو رقمها</span>
            <Icon name="search" size={20} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[hsl(var(--header-muted))]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث باسم السورة أو رقمها..."
              autoFocus
              className="w-full h-11 rounded-xl bg-white/12 border border-white/15 pr-11 pl-11 text-[0.95rem] text-[hsl(var(--header-foreground))] placeholder:text-[hsl(var(--header-muted))] focus:outline-none focus:ring-2 focus:ring-gold/60"
              dir="rtl"
              data-testid="search-input"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="مسح البحث"
                className="absolute left-1 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center text-[hsl(var(--header-muted))]"
              >
                <Icon name="x" size={18} />
              </button>
            )}
          </label>
        </div>
      }
    >
      <div className="screen__inner pb-8">
        {!debouncedQuery && (
          <div className="text-center px-8 py-16 text-muted-foreground">
            <p className="font-bold text-foreground mb-1">ابحث في سور القرآن الكريم</p>
            <p className="text-sm">أدخل اسم السورة أو رقمها</p>
          </div>
        )}
        {debouncedQuery && isLoading && (
          <div className="px-4 pt-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        )}
        {debouncedQuery && isError && (
          <p className="text-center text-sm text-muted-foreground px-8 py-14">تعذّر البحث الآن. تحقق من الاتصال وحاول مجددًا.</p>
        )}
        {debouncedQuery && data && (
          surahs.length === 0 ? (
            <div className="text-center py-14 text-muted-foreground">
              <p className="font-bold text-foreground mb-1">لا توجد نتائج</p>
              <p className="text-sm">جرّب كلمة بحث أخرى</p>
            </div>
          ) : (
            <section className="list-section" data-testid="search-results">
              <h2 className="list-section__title">{ar(surahs.length)} نتيجة</h2>
              <div className="list-group">
                {surahs.map((s) => (
                  <ListRow
                    key={s.id}
                    href={`/mushaf/${s.number}`}
                    label={`${ar(s.number)}. سورة ${s.name}`}
                    hint={`${s.revelationType === "Meccan" ? "مكية" : "مدنية"} · ${ar(s.versesCount)} آية`}
                  />
                ))}
              </div>
            </section>
          )
        )}
      </div>
    </Screen>
  );
}
