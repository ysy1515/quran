import { Link } from "wouter";
import Screen from "@/components/shell/Screen";

export default function NotFound() {
  return (
    <Screen title="غير موجودة" back="/">
      <div className="text-center px-6 py-20">
        <div className="text-6xl font-extrabold text-primary/20 dark:text-gold/30 mb-4">٤٠٤</div>
        <h2 className="font-bold text-xl text-foreground mb-2">الصفحة غير موجودة</h2>
        <p className="text-muted-foreground text-sm mb-6">الصفحة التي تبحث عنها غير متوفرة</p>
        <Link href="/" className="btn btn-primary">
          العودة للرئيسية
        </Link>
      </div>
    </Screen>
  );
}
