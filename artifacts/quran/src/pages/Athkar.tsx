import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ATHKAR_CATEGORIES } from "@/data/athkar";
import Screen from "@/components/shell/Screen";
import FeatureArt, { type FeatureArtName } from "@/components/art/FeatureArt";
import { Icon } from "@/components/icons/Icon";
import { ListSection, ListRow } from "@/components/kit/List";
import { useDhikrState } from "@/lib/dhikr";
import { ar } from "@/lib/format";

interface Tile {
  id: string;
  href: string;
  title: string;
  hint?: string;
  art: FeatureArtName;
  tone: 1 | 2 | 3 | 4 | 5;
  wide?: boolean;
}

// Layout follows the reference: two wide tiles, then a two-column grid.
// Categories marked "coming soon" in the data have no content yet, so they get
// no tile (an empty tile would be a dead control).
const LAYOUT: { id: string; art: FeatureArtName; tone: Tile["tone"]; wide?: boolean }[] = [
  { id: "morning", art: "morning", tone: 1, wide: true },
  { id: "evening", art: "evening", tone: 2, wide: true },
  { id: "post-prayer", art: "post-prayer", tone: 3 },
  { id: "sleep", art: "sleep", tone: 4 },
  { id: "istighfar", art: "istighfar", tone: 2 },
  { id: "praise", art: "praise", tone: 5 },
  { id: "salah-nabi", art: "salah-nabi", tone: 1 },
  { id: "istiazah", art: "istiazah", tone: 3 },
];

function TileCard({ tile }: { tile: Tile }) {
  return (
    <Link
      href={tile.href}
      className={`tile tile--t${tile.tone} ${tile.wide ? "tile--wide" : ""}`}
      data-testid={`tile-${tile.id}`}
    >
      <span className="tile__art">
        <FeatureArt name={tile.art} size={tile.wide ? 124 : 96} />
      </span>
      <span className="tile__title">{tile.title}</span>
      {tile.hint && <span className="tile__hint">{tile.hint}</span>}
    </Link>
  );
}

export default function Athkar() {
  const dhikr = useDhikrState();
  const [searching, setSearching] = useState(false);
  const [search, setSearch] = useState("");

  const tiles: Tile[] = useMemo(() => {
    const byId = new Map(ATHKAR_CATEGORIES.map((c) => [c.id, c]));
    const list: Tile[] = [];
    for (const l of LAYOUT) {
      const c = byId.get(l.id);
      if (!c || c.comingSoon || c.items.length === 0) continue;
      list.push({ id: c.id, href: `/athkar/${c.id}`, title: c.title, art: l.art, tone: l.tone, wide: l.wide });
    }
    list.push({
      id: "tasbeeh",
      href: "/dhikr",
      title: "عداد التسبيح",
      hint: dhikr.count > 0 ? `${ar(dhikr.count)} من ${ar(dhikr.target)}` : "سبحة إلكترونية",
      art: "tasbeeh",
      tone: 5,
      wide: true,
    });
    return list;
  }, [dhikr.count, dhikr.target]);

  const q = search.trim();
  const results = useMemo(() => {
    if (!q) return [];
    return ATHKAR_CATEGORIES.filter(
      (c) => !c.comingSoon && (c.title.includes(q) || c.description?.includes(q) || c.items.some((i) => i.text.includes(q))),
    );
  }, [q]);

  return (
    <Screen
      title="الأذكار"
      endActions={[
        {
          label: searching ? "إغلاق البحث" : "ابحث في الأذكار",
          icon: <Icon name={searching ? "x" : "search"} size={24} />,
          onClick: () => {
            setSearching((v) => !v);
            setSearch("");
          },
          testId: "athkar-search-toggle",
        },
      ]}
      headerExtra={
        searching ? (
          <div className="relative z-[1] px-3 pb-3">
            <input
              autoFocus
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث في الأذكار..."
              aria-label="ابحث في الأذكار"
              className="w-full rounded-xl bg-card text-foreground px-4 py-2.5 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-gold"
              dir="rtl"
            />
          </div>
        ) : undefined
      }
    >
      <div className="screen__inner pb-8">
        {q ? (
          results.length ? (
            <ListSection title={`${ar(results.length)} نتيجة`}>
              {results.map((c) => (
                <ListRow key={c.id} href={`/athkar/${c.id}`} label={c.title} hint={c.description} value={ar(c.items.length)} />
              ))}
            </ListSection>
          ) : (
            <p className="text-center text-muted-foreground px-6 py-16">لا توجد نتائج للبحث عن «{q}»</p>
          )
        ) : (
          <div className="grid grid-cols-2 gap-2.5 p-2.5 page-enter" data-testid="athkar-grid">
            {tiles.map((t) => (
              <TileCard key={t.id} tile={t} />
            ))}
          </div>
        )}
        <p className="mx-4 mt-4 text-center text-xs text-muted-foreground leading-relaxed">
          الأذكار مستمدة من الأحاديث النبوية الصحيحة · للمزيد راجع كتب الأذكار المعتمدة
        </p>
      </div>
    </Screen>
  );
}
