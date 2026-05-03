export default function About() {
  return (
    <div className="page-enter max-w-2xl mx-auto px-4 py-6" dir="rtl">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="font-quran text-2xl text-primary">ق</span>
        </div>
        <h1 className="font-quran text-2xl font-bold text-foreground">القرآن الكريم</h1>
        <p className="text-sm text-muted-foreground mt-2">تطبيق للتلاوة والتفسير</p>
      </div>

      <div className="space-y-4">
        {/* About */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-3">عن التطبيق</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            هذا التطبيق مخصص لعرض القرآن الكريم وتفسير آياته. يستخدم التطبيق
            مصادر موثوقة لضمان دقة النصوص القرآنية والتفاسير. يمكنك قراءة السور،
            الاستماع إلى التفسير عند الضغط على أي آية، وحفظ الآيات في علامات مرجعية.
          </p>
        </div>

        {/* Data Sources */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">مصادر البيانات</h2>

          <div className="space-y-4">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4 text-emerald-600">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">نصوص القرآن الكريم</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Quran.com API — واجهة برمجية موثوقة توفر نص القرآن الكريم
                  برواية حفص عن عاصم بخط عثماني.
                </p>
                <a
                  href="https://quran.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  quran.com
                </a>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4 text-amber-600">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">التفسير</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  تفسير ابن كثير (الإمام أبو الفداء إسماعيل بن كثير)
                  عبر Quran.com API. يُعدّ من أشهر التفاسير وأوسعها انتشاراً.
                </p>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4 text-blue-600">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">ضمان الدقة</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  لا يتم تعديل أي نص قرآني. جميع النصوص مستقاة مباشرة
                  من مصادرها الموثوقة دون تدخل. يتم تخزين التفسير مؤقتاً
                  لتحسين الأداء دون أي تعديل.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex gap-2 items-start">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
              هذا التطبيق مصدر للمعلومات الدينية. في حال وجود أي خطأ أو تعذّر تحميل
              المحتوى، يُرجى التحقق من المصادر الأصلية المعتمدة.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
