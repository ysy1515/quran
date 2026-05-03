import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" dir="rtl">
      <div className="text-center">
        <div className="font-quran text-6xl font-bold text-primary/20 mb-4">٤٠٤</div>
        <h1 className="font-medium text-xl text-foreground mb-2">الصفحة غير موجودة</h1>
        <p className="text-muted-foreground text-sm mb-6">
          الصفحة التي تبحث عنها غير متوفرة
        </p>
        <Link href="/">
          <a className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            العودة للرئيسية
          </a>
        </Link>
      </div>
    </div>
  );
}
