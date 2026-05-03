import { useTheme } from "next-themes";
import {
  useGetSettings,
  getGetSettingsQueryKey,
  useUpdateSettings,
} from "@workspace/api-client-react";
import { toast } from "sonner";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  const { data: settings, isLoading } = useGetSettings({
    query: { queryKey: getGetSettingsQueryKey() },
  });

  const updateSettings = useUpdateSettings();

  const handleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    updateSettings.mutate(
      { theme: newTheme },
      { onSuccess: () => toast.success("تم حفظ الإعدادات") }
    );
  };

  const handleFontSize = (size: number) => {
    updateSettings.mutate(
      { fontSize: size },
      { onSuccess: () => toast.success("تم حفظ حجم الخط") }
    );
  };

  const handleTafsir = (show: boolean) => {
    updateSettings.mutate(
      { showTafsir: show },
      { onSuccess: () => toast.success("تم حفظ الإعدادات") }
    );
  };

  return (
    <div className="page-enter max-w-xl mx-auto px-4 py-6" dir="rtl">
      <h1 className="font-quran text-2xl font-bold text-foreground mb-6 text-center">
        الإعدادات
      </h1>

      <div className="space-y-4">
        {/* Appearance */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-medium text-foreground mb-4">المظهر</h2>

          <div className="flex gap-3">
            <button
              onClick={() => handleTheme("light")}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                theme === "light"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5 text-amber-500">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              </div>
              <span className="text-sm font-medium">النهاري</span>
            </button>

            <button
              onClick={() => handleTheme("dark")}
              className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                theme === "dark"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5 text-indigo-300">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              </div>
              <span className="text-sm font-medium">الليلي</span>
            </button>
          </div>
        </div>

        {/* Font Size */}
        {settings && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h2 className="font-medium text-foreground mb-1">حجم خط القرآن</h2>
            <p className="text-xs text-muted-foreground mb-4">
              {settings.fontSize}%
            </p>

            <input
              type="range"
              min={80}
              max={160}
              step={10}
              defaultValue={settings.fontSize}
              onMouseUp={(e) => handleFontSize(parseInt((e.target as HTMLInputElement).value, 10))}
              onTouchEnd={(e) => handleFontSize(parseInt((e.target as HTMLInputElement).value, 10))}
              className="w-full accent-primary"
            />

            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>80%</span>
              <span>120%</span>
              <span>160%</span>
            </div>

            {/* Preview */}
            <div className="mt-4 p-3 bg-muted rounded-lg text-center">
              <p
                className="font-quran text-foreground"
                style={{ fontSize: `${settings.fontSize}%` }}
                dir="rtl"
              >
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
              </p>
            </div>
          </div>
        )}

        {/* Tafsir */}
        {settings && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium text-foreground">التفسير</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  تفسير ابن كثير (الافتراضي)
                </p>
              </div>
              <button
                onClick={() => handleTafsir(!settings.showTafsir)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.showTafsir ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
                    settings.showTafsir ? "right-1" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
