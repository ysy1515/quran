import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  useGetSettings,
  getGetSettingsQueryKey,
  useUpdateSettings,
} from "@workspace/api-client-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-12 h-6 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted-foreground/30"}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? "right-1" : "left-1"}`} />
    </button>
  );
}

interface NotifTimes {
  notifQuran1: string;
  notifQuran2: string;
  notifDhikr: string;
}

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-foreground">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-muted border border-border rounded-lg px-2 py-1 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
        dir="ltr"
      />
    </div>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { data: settings, isLoading } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const updateSettings = useUpdateSettings();
  const push = usePushNotifications();

  const [notifTimes, setNotifTimes] = useState<NotifTimes>({
    notifQuran1: "12:00",
    notifQuran2: "18:00",
    notifDhikr: "21:00",
  });
  const [savingTimes, setSavingTimes] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/api/push/times`)
      .then((r) => r.json())
      .then((data: NotifTimes) => setNotifTimes(data))
      .catch(() => {});
  }, []);

  const handleTheme = (t: "light" | "dark") => {
    setTheme(t);
    updateSettings.mutate({ data: { theme: t } }, { onSuccess: () => toast.success("تم حفظ الإعدادات") });
  };

  const handleFontSize = (size: number) => {
    updateSettings.mutate({ data: { fontSize: size } }, { onSuccess: () => toast.success("تم حفظ حجم الخط") });
  };

  const handleTafsir = (show: boolean) => {
    updateSettings.mutate({ data: { showTafsir: show } }, { onSuccess: () => toast.success("تم حفظ الإعدادات") });
  };

  const handleTimeChange = (key: keyof NotifTimes, val: string) => {
    setNotifTimes((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveTimes = async () => {
    setSavingTimes(true);
    try {
      await fetch(`${BASE}/api/push/times`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notifTimes),
      });
      toast.success("تم حفظ مواعيد الإشعارات");
    } catch {
      toast.error("فشل حفظ المواعيد");
    } finally {
      setSavingTimes(false);
    }
  };

  const handleEnableNotifications = async () => {
    await push.register();
    toast.success("تم تفعيل الإشعارات");
  };

  const handleDisableNotifications = async () => {
    await push.unsubscribe();
    toast.success("تم إيقاف الإشعارات");
  };

  const handlePrefChange = async (key: "notifyQuran" | "notifyDhikr", value: boolean) => {
    const newPrefs = { ...push.prefs, [key]: value };
    await push.updatePreferences(newPrefs);
    toast.success("تم حفظ التفضيلات");
  };

  const sl = {
    unsupported: { text: "غير مدعوم في هذا المتصفح", color: "text-destructive" },
    denied: { text: "محظور — أعد تشغيل الإذن من إعدادات المتصفح", color: "text-destructive" },
    default: { text: "غير مفعّل", color: "text-muted-foreground" },
    granted: { text: "الإذن ممنوح — اضغط تفعيل", color: "text-amber-500" },
    subscribed: { text: "مفعّل ✓", color: "text-primary" },
  }[push.status] ?? { text: "غير مفعّل", color: "text-muted-foreground" };

  return (
    <div className="page-enter max-w-xl mx-auto px-4 py-6" dir="rtl">
      <h1 className="font-quran text-2xl font-bold text-foreground mb-6 text-center">الإعدادات</h1>

      <div className="space-y-4">
        {/* Appearance */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-medium text-foreground mb-4">المظهر</h2>
          <div className="flex gap-3">
            <button onClick={() => handleTheme("light")} className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === "light" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5 text-amber-500">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              </div>
              <span className="text-sm font-medium">النهاري</span>
            </button>
            <button onClick={() => handleTheme("dark")} className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === "dark" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
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
            <p className="text-xs text-muted-foreground mb-4">{settings.fontSize}%</p>
            <input type="range" min={80} max={160} step={10} defaultValue={settings.fontSize}
              onMouseUp={(e) => handleFontSize(parseInt((e.target as HTMLInputElement).value, 10))}
              onTouchEnd={(e) => handleFontSize(parseInt((e.target as HTMLInputElement).value, 10))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>80%</span><span>120%</span><span>160%</span>
            </div>
            <div className="mt-4 p-3 bg-muted rounded-lg text-center">
              <p className="font-quran text-foreground" style={{ fontSize: `${settings.fontSize}%` }} dir="rtl">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
            </div>
          </div>
        )}

        {/* Tafsir */}
        {settings && (
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-medium text-foreground">التفسير</h2>
                <p className="text-xs text-muted-foreground mt-0.5">تفسير ابن كثير (الافتراضي)</p>
              </div>
              <Toggle on={settings.showTafsir} onChange={handleTafsir} />
            </div>
          </div>
        )}

        {/* Push Notifications */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5 text-primary">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="font-medium text-foreground">الإشعارات</h2>
              <p className={`text-xs mt-0.5 ${sl.color}`}>{sl.text}</p>
            </div>
            {push.status === "subscribed" ? (
              <button onClick={handleDisableNotifications} disabled={push.loading}
                className="text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50">
                {push.loading ? "..." : "إيقاف"}
              </button>
            ) : push.status !== "unsupported" && push.status !== "denied" ? (
              <button onClick={handleEnableNotifications} disabled={push.loading}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                {push.loading ? "..." : "تفعيل"}
              </button>
            ) : null}
          </div>

          {/* Preferences when subscribed */}
          {push.status === "subscribed" && (
            <div className="space-y-3 border-t border-border pt-4 mb-4">
              <p className="text-xs font-medium text-foreground">تفضيلات الإشعارات</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>📖</span>
                  <div>
                    <p className="text-sm text-foreground">ورد القرآن اليومي</p>
                    <p className="text-xs text-muted-foreground">{notifTimes.notifQuran1} و {notifTimes.notifQuran2} (توقيت السعودية)</p>
                  </div>
                </div>
                <Toggle on={push.prefs.notifyQuran} onChange={(v) => handlePrefChange("notifyQuran", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>📿</span>
                  <div>
                    <p className="text-sm text-foreground">أذكار المساء</p>
                    <p className="text-xs text-muted-foreground">{notifTimes.notifDhikr} (توقيت السعودية)</p>
                  </div>
                </div>
                <Toggle on={push.prefs.notifyDhikr} onChange={(v) => handlePrefChange("notifyDhikr", v)} />
              </div>
            </div>
          )}

          {/* Custom notification times — always visible */}
          {push.status !== "unsupported" && (
            <div className={`${push.status === "subscribed" ? "border-t border-border pt-4" : ""}`}>
              <p className="text-xs font-medium text-foreground mb-3">
                {push.status === "subscribed" ? "تخصيص مواعيد الإشعارات (توقيت السعودية)" : "مواعيد الإشعارات (توقيت السعودية)"}
              </p>
              <div className="divide-y divide-border">
                <TimeInput label="📖 ورد القرآن الأول" value={notifTimes.notifQuran1} onChange={(v) => handleTimeChange("notifQuran1", v)} />
                <TimeInput label="📖 ورد القرآن الثاني" value={notifTimes.notifQuran2} onChange={(v) => handleTimeChange("notifQuran2", v)} />
                <TimeInput label="📿 أذكار المساء" value={notifTimes.notifDhikr} onChange={(v) => handleTimeChange("notifDhikr", v)} />
              </div>
              {push.status === "subscribed" && (
                <button
                  onClick={handleSaveTimes}
                  disabled={savingTimes}
                  className="mt-3 w-full py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {savingTimes ? "جاري الحفظ..." : "حفظ المواعيد"}
                </button>
              )}
            </div>
          )}
        </div>

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
