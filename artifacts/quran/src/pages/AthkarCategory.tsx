import { useState } from "react";
import { useParams } from "wouter";
import { ATHKAR_CATEGORIES, type AthkarItem } from "@/data/athkar";
import Screen from "@/components/shell/Screen";
import { Icon } from "@/components/icons/Icon";
import { copyToClipboard } from "@/lib/clipboard";
import { ar } from "@/lib/format";
import NotFound from "./not-found";

function DhikrItemCard({ item, index }: { item: AthkarItem; index: number }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(item.text, "تم نسخ الذكر");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="card px-5 pt-4 pb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="w-8 h-8 rounded-full grid place-items-center text-sm font-bold bg-primary/10 text-primary dark:bg-gold/15 dark:text-gold">
          {ar(index + 1)}
        </span>
        {(item.count || item.countNote) && (
          <span className="text-sm font-bold px-3 py-1 rounded-full bg-gold/15 text-gold-deep">
            {item.countNote ?? `${ar(item.count!)} ${item.count === 1 ? "مرة" : "مرات"}`}
          </span>
        )}
      </div>
      <p className="font-quran text-foreground text-right leading-[2.3] text-[1.2rem] whitespace-pre-line" dir="rtl">
        {item.text}
      </p>
      <div className="flex items-center justify-between gap-3 mt-3">
        {item.source ? <span className="text-xs text-muted-foreground">{item.source}</span> : <span />}
        <button
          type="button"
          onClick={handleCopy}
          className={`flex-none inline-flex items-center gap-1.5 px-3 min-h-9 rounded-lg text-sm font-bold transition-colors active:scale-95 ${
            copied ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon name="copy" size={16} />
          {copied ? "تم النسخ" : "نسخ"}
        </button>
      </div>
    </article>
  );
}

export default function AthkarCategory() {
  const { id } = useParams<{ id: string }>();
  const category = ATHKAR_CATEGORIES.find((c) => c.id === id);
  if (!category) return <NotFound />;

  return (
    <Screen title={category.title} subtitle={category.description} back="/athkar">
      <div className="screen__inner px-4 pt-4 pb-10 space-y-3 page-enter">
        {category.comingSoon || category.items.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">سيتم إضافة المحتوى قريباً بإذن الله</p>
        ) : (
          category.items.map((item, idx) => <DhikrItemCard key={item.id} item={item} index={idx} />)
        )}
      </div>
    </Screen>
  );
}
