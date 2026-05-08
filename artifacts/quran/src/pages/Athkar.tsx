import { useState, useMemo } from "react";
import { ATHKAR_CATEGORIES, type AthkarCategory, type AthkarItem } from "@/data/athkar";
import { copyToClipboard } from "@/lib/clipboard";

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function DhikrItemCard({ item }: { item: AthkarItem }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(item.text, "تم نسخ الذكر");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <p
        className="font-quran text-foreground text-right leading-[2.4] text-lg mb-4"
        dir="rtl"
      >
        {item.text}
      </p>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {(item.count || item.countNote) && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold" dir="ltr">
              ×{item.countNote ?? item.count}
            </span>
          )}
          {item.source && (
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {item.source}
            </span>
          )}
        </div>

        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 ${
            copied
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
          }`}
        >
          <CopyIcon />
          {copied ? "تم النسخ" : "نسخ"}
        </button>
      </div>
    </div>
  );
}

function CategoryDetail({
  category,
  onBack,
}: {
  category: AthkarCategory;
  onBack: () => void;
}) {
  return (
    <div className="page-enter" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground hover:bg-border transition-colors active:scale-95 flex-shrink-0 rotate-180"
        >
          <BackIcon />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{category.icon}</span>
            <h1 className="font-quran text-xl font-bold text-foreground">{category.title}</h1>
          </div>
          {category.description && (
            <p className="text-sm text-muted-foreground mt-0.5">{category.description}</p>
          )}
        </div>
      </div>

      {/* Coming Soon */}
      {category.comingSoon && (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <span className="text-4xl mb-4 block">{category.icon}</span>
          <p className="font-medium text-foreground mb-2">{category.title}</p>
          <p className="text-sm text-muted-foreground">سيتم إضافة المحتوى قريباً بإذن الله</p>
        </div>
      )}

      {/* Items */}
      {!category.comingSoon && category.items.length > 0 && (
        <div className="space-y-4">
          {category.items.map((item, idx) => (
            <div key={item.id} className="relative">
              <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center z-10">
                <span className="text-[10px] font-bold text-primary" dir="ltr">{idx + 1}</span>
              </div>
              <DhikrItemCard item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Athkar() {
  const [selected, setSelected] = useState<AthkarCategory | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return ATHKAR_CATEGORIES;
    const q = search.toLowerCase();
    return ATHKAR_CATEGORIES.filter(
      (c) =>
        c.title.includes(search) ||
        c.description?.includes(search) ||
        c.items.some((i) => i.text.includes(search))
    );
  }, [search]);

  if (selected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <CategoryDetail category={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="page-enter max-w-2xl mx-auto px-4 py-6" dir="rtl">
      <div className="text-center mb-6">
        <h1 className="font-quran text-2xl font-bold text-foreground mb-1">الأذكار</h1>
        <p className="text-sm text-muted-foreground">أذكار يومية من السنة النبوية الشريفة</p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث في الأذكار..."
          className="w-full bg-card border border-border rounded-xl pr-10 pl-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-colors"
          dir="rtl"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Categories Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">لا توجد نتائج للبحث عن «{search}»</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelected(cat)}
              className="w-full text-right bg-card border border-border rounded-2xl p-4 hover:border-primary/30 hover:bg-primary/3 transition-all active:scale-98 group shadow-sm"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-base">{cat.title}</p>
                  {cat.comingSoon ? (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full inline-block mt-0.5">
                      قريباً
                    </span>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{cat.description}</p>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-1">
                  {!cat.comingSoon && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {cat.items.length}
                    </span>
                  )}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors rotate-180"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 bg-muted/40 rounded-xl px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground leading-relaxed">
          الأذكار مستمدة من الأحاديث النبوية الصحيحة · للمزيد راجع كتب الأذكار المعتمدة
        </p>
      </div>
    </div>
  );
}
