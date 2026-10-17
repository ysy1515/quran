import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import Screen from "@/components/shell/Screen";
import { ListSection, ListRow, Segmented, Switch } from "@/components/kit/List";
import { usePushNotifications, type NotifTimes } from "@/hooks/usePushNotifications";
import { FONT_SIZE_MAX, FONT_SIZE_MIN, useReaderSettings } from "@/lib/userData";
import { ar } from "@/lib/format";

function TimeRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="list-row list-row--plain">
      <span className="list-row__body list-row__label">{label}</span>
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="time-value" dir="ltr" />
    </label>
  );
}

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { settings, setFontSize, setShowTafsir } = useReaderSettings();
  const push = usePushNotifications();
  const [fontDraft, setFontDraft] = useState(settings.fontSize);
  const [notifTimes, setNotifTimes] = useState<NotifTimes>(push.times);
  const [savingTimes, setSavingTimes] = useState(false);

  useEffect(() => setNotifTimes(push.times), [push.times]);
  useEffect(() => setFontDraft(settings.fontSize), [settings.fontSize]);

  const commitFont = () => {
    if (fontDraft === settings.fontSize) return;
    setFontSize(fontDraft);
    toast.success("تم حفظ حجم الخط");
  };

  const handleSaveTimes = async () => {
    setSavingTimes(true);
    try {
      await push.saveTimes(notifTimes);
      toast.success("تم حفظ مواعيد الإشعارات");
    } catch {
      toast.error("فشل حفظ المواعيد");
    } finally {
      setSavingTimes(false);
    }
  };

  const handlePrefChange = async (key: "notifyQuran" | "notifyDhikr", value: boolean) => {
    await push.updatePreferences({ ...push.prefs, [key]: value });
    toast.success("تم حفظ التفضيلات");
  };

  const status = {
    unsupported: "الإشعارات غير مدعومة في هذا المتصفح",
    native: "الإشعارات متاحة عبر التطبيق",
    denied: "محظور، أعد تشغيل الإذن من إعدادات الجهاز",
    default: "غير مفعّل",
    granted: "الإذن ممنوح، اضغط تفعيل",
    subscribed: "مفعّل",
  }[push.status] ?? "غير مفعّل";

  return (
    <Screen title="المظهر والقراءة" back="/more">
      <div className="screen__inner pb-10">
        <ListSection title="المظهر">
          <div className="px-4 py-3">
            <Segmented
              label="المظهر"
              value={theme === "dark" ? "dark" : "light"}
              onChange={(t) => {
                setTheme(t);
                toast.success("تم حفظ الإعدادات");
              }}
              options={[
                { value: "light", label: "النهاري" },
                { value: "dark", label: "الليلي" },
              ]}
            />
          </div>
        </ListSection>

        <ListSection title="حجم خط القرآن">
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <span className="font-quran text-sm" aria-hidden="true">ص</span>
              <input
                type="range"
                aria-label="حجم خط القرآن"
                min={FONT_SIZE_MIN}
                max={FONT_SIZE_MAX}
                step={10}
                value={fontDraft}
                onChange={(e) => setFontDraft(parseInt(e.target.value, 10))}
                onPointerUp={commitFont}
                onKeyUp={commitFont}
                onBlur={commitFont}
                className="flex-1 accent-[hsl(var(--primary))]"
              />
              <span className="font-quran text-2xl" aria-hidden="true">ص</span>
              <span className="text-sm text-muted-foreground w-12 text-left">{ar(fontDraft)}٪</span>
            </div>
            <p className="font-quran text-foreground text-center mt-4 py-3 rounded-xl bg-muted" style={{ fontSize: `${fontDraft * 1.3}%` }} dir="rtl">
              بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
            </p>
          </div>
        </ListSection>

        <ListSection title="التفسير">
          <ListRow
            label="التفسير"
            hint="تفسير ابن كثير (الافتراضي)"
            trailing={
              <Switch
                checked={settings.showTafsir}
                onChange={(v) => {
                  setShowTafsir(v);
                  toast.success("تم حفظ الإعدادات");
                }}
                label="التفسير"
              />
            }
          />
        </ListSection>

        {push.status !== "native" && (
          <ListSection title="إشعارات المتصفح" footer="تذكيرات الصلاة تُضبط من صفحة الصلاة.">
            <ListRow
              icon="bell"
              label="الإشعارات"
              hint={status}
              trailing={
                push.status === "subscribed" ? (
                  <button
                    type="button"
                    className="btn btn-danger !min-h-9 !px-4 !text-sm"
                    disabled={push.loading}
                    onClick={async () => {
                      await push.unsubscribe();
                      toast.success("تم إيقاف الإشعارات");
                    }}
                  >
                    {push.loading ? "..." : "إيقاف"}
                  </button>
                ) : push.status !== "unsupported" && push.status !== "denied" ? (
                  <button
                    type="button"
                    className="btn btn-primary !min-h-9 !px-4 !text-sm"
                    disabled={push.loading}
                    onClick={async () => {
                      await push.register();
                      toast.success("تم تفعيل الإشعارات");
                    }}
                  >
                    {push.loading ? "..." : "تفعيل"}
                  </button>
                ) : undefined
              }
            />
            {push.status === "subscribed" && (
              <>
                <ListRow
                  label="ورد القرآن اليومي"
                  hint={`${notifTimes.notifQuran1} و ${notifTimes.notifQuran2} (توقيت السعودية)`}
                  trailing={<Switch checked={push.prefs.notifyQuran} onChange={(v) => void handlePrefChange("notifyQuran", v)} label="ورد القرآن اليومي" />}
                />
                <ListRow
                  label="أذكار المساء"
                  hint={`${notifTimes.notifDhikr} (توقيت السعودية)`}
                  trailing={<Switch checked={push.prefs.notifyDhikr} onChange={(v) => void handlePrefChange("notifyDhikr", v)} label="أذكار المساء" />}
                />
              </>
            )}
            {push.status !== "unsupported" && (
              <>
                <TimeRow label="ورد القرآن الأول" value={notifTimes.notifQuran1} onChange={(v) => setNotifTimes((p) => ({ ...p, notifQuran1: v }))} />
                <TimeRow label="ورد القرآن الثاني" value={notifTimes.notifQuran2} onChange={(v) => setNotifTimes((p) => ({ ...p, notifQuran2: v }))} />
                <TimeRow label="أذكار المساء" value={notifTimes.notifDhikr} onChange={(v) => setNotifTimes((p) => ({ ...p, notifDhikr: v }))} />
              </>
            )}
          </ListSection>
        )}
        {push.status === "subscribed" && (
          <div className="px-4 mt-3">
            <button type="button" className="btn btn-soft w-full" onClick={handleSaveTimes} disabled={savingTimes}>
              {savingTimes ? "جاري الحفظ..." : "حفظ المواعيد"}
            </button>
          </div>
        )}
      </div>
    </Screen>
  );
}
