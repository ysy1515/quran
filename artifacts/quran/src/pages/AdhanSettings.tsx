import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Screen from "@/components/shell/Screen";
import { ListSection, ListRow, Segmented, Switch } from "@/components/kit/List";
import Sheet from "@/components/kit/Sheet";
import { Icon } from "@/components/icons/Icon";
import { useLocalNotifications } from "@/hooks/useLocalNotifications";
import {
  isSnoozed,
  prayerTimesFor,
  PRAYER_LABEL,
  requestLocation,
  setManualLocation,
  updateAdhanPrefs,
  useAdhanPrefs,
  useCoords,
  usePlace,
  type AlertSound,
  type PrayerKey,
} from "@/lib/prayer";
import { ar, clock } from "@/lib/format";
import { getCapacitorPlatform, isCapacitorNative } from "@/lib/appConfig";
import { MUEZZINS } from "@/lib/muezzins";
import { SAUDI_CITIES } from "@/lib/cities";
import { playAdhan, stopAdhan, useAdhanPlayer } from "@/lib/adhanPlayer";
import {
  checkExactAlarm,
  openExactAlarmSettings,
  pendingNotifications,
  sendTestNotification,
  syncPrayerNotifications,
  type PendingOverview,
} from "@/lib/prayerNotifications";

const CALC_METHODS: { id: string; label: string }[] = [
  { id: "UmmAlQura", label: "أم القرى — السعودية" },
  { id: "MuslimWorldLeague", label: "رابطة العالم الإسلامي" },
  { id: "Egyptian", label: "الهيئة المصرية للمساحة" },
  { id: "Karachi", label: "جامعة العلوم الإسلامية كراتشي" },
  { id: "NorthAmerica", label: "أمريكا الشمالية (ISNA)" },
  { id: "Dubai", label: "دبي" },
  { id: "Kuwait", label: "الكويت" },
  { id: "Qatar", label: "قطر" },
  { id: "Singapore", label: "سنغافورة" },
  { id: "Turkey", label: "تركيا" },
];

const SNOOZE_OPTIONS: { label: string; days: number | "forever" }[] = [
  { label: "إيقاف لمدة ٣ أيام", days: 3 },
  { label: "إيقاف لمدة ٥ أيام", days: 5 },
  { label: "إيقاف لمدة ٧ أيام", days: 7 },
  { label: "إيقاف حتى التفعيل اليدوي", days: "forever" },
];

function snoozeLabel(until: number | null): string {
  if (!until) return "";
  if (until === -1) return "موقوف حتى التفعيل";
  return `موقوف حتى ${new Date(until).toLocaleDateString("ar-SA", { weekday: "long", month: "short", day: "numeric" })}`;
}

function timeLabel(d: Date | null): string {
  if (!d) return "—";
  const c = clock(d);
  return `${d.toLocaleDateString("ar", { weekday: "short", day: "numeric", month: "numeric" })} ${c.time} ${c.period}`;
}

const SOUND_FOOTER: Record<"ios" | "android" | "web", Record<AlertSound, string>> = {
  ios: {
    adhan: "يُشغَّل مع الإشعار مقطع من بداية الأذان مدته ٢٩ ثانية (أقصى مدة يسمح بها iOS لصوت الإشعار). اضغط على الإشعار لسماع الأذان كاملًا داخل التطبيق.",
    device: "يُشغَّل صوت الإشعار الافتراضي في جهازك.",
  },
  android: {
    adhan: "يُشغَّل الأذان كاملًا بصوت المؤذن المختار مع الإشعار، ويتوقف عند إزالة الإشعار أو الضغط عليه.",
    device: "يُشغَّل صوت الإشعار الافتراضي في جهازك.",
  },
  web: {
    adhan: "تنبيهات الأذان بالصوت متاحة في تطبيق الجوال.",
    device: "تنبيهات الأذان بالصوت متاحة في تطبيق الجوال.",
  },
};

export default function AdhanSettings() {
  const prefs = useAdhanPrefs();
  const coords = useCoords();
  const place = usePlace();
  const { permission, requestPermission, checkPermission, cancelAllPrayer } = useLocalNotifications();
  const player = useAdhanPlayer();
  const [locLoading, setLocLoading] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [exact, setExact] = useState<"granted" | "denied" | "unsupported">("unsupported");
  const [diag, setDiag] = useState<PendingOverview | null>(null);
  const snoozed = isSnoozed(prefs.snoozedUntil);
  const platform = getCapacitorPlatform();
  const native = isCapacitorNative();

  useEffect(() => () => stopAdhan(), []);

  const refreshStatus = useCallback(async () => {
    setExact(await checkExactAlarm());
    await checkPermission();
  }, [checkPermission]);

  useEffect(() => {
    void refreshStatus();
    const onVisible = () => document.visibilityState === "visible" && void refreshStatus();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshStatus]);

  const preview = async (id: string, url: string) => {
    if (player.playing === id) return stopAdhan();
    if (!(await playAdhan(id, url))) toast.error("تعذّر تشغيل ملف الأذان");
  };

  const locate = async () => {
    setLocLoading(true);
    try {
      await requestLocation();
      toast.success("تم تحديد الموقع");
      return true;
    } catch (err) {
      const denied = (err as GeolocationPositionError)?.code === 1;
      toast.error(denied ? "تم رفض الوصول إلى الموقع، يمكنك السماح من الإعدادات أو اختيار مدينتك" : "تعذّر تحديد الموقع، يمكنك اختيار مدينتك من القائمة");
      return false;
    } finally {
      setLocLoading(false);
    }
  };

  const setEnabled = async (on: boolean) => {
    if (!on) {
      updateAdhanPrefs({ enabled: false });
      await cancelAllPrayer();
      toast("تم إيقاف تنبيهات الأذان");
      return;
    }
    if (!coords && !(await locate())) return;
    if (!(await requestPermission())) {
      toast.error("لم يتم منح إذن الإشعارات، يرجى السماح من إعدادات الجهاز");
      return;
    }
    updateAdhanPrefs({ enabled: true, snoozedUntil: null });
    toast.success("تم تفعيل تنبيهات الأذان");
  };

  const snooze = (days: number | "forever") => {
    updateAdhanPrefs({ snoozedUntil: days === "forever" ? -1 : Date.now() + days * 86400000 });
    setSnoozeOpen(false);
    toast.success(days === "forever" ? "تم إيقاف الأذان حتى التفعيل اليدوي" : `تم إيقاف الأذان ${ar(days)} أيام`);
  };

  const loadDiagnostics = async () => {
    if (coords) await syncPrayerNotifications(coords, prefs);
    setDiag(await pendingNotifications());
    await refreshStatus();
  };

  const test = async () => {
    if (!(await requestPermission())) {
      toast.error("لم يتم منح إذن الإشعارات، يرجى السماح من إعدادات الجهاز");
      return;
    }
    if (await sendTestNotification(prefs)) toast.success("سيصلك إشعار تجريبي بعد ٥ ثوانٍ، يمكنك قفل الشاشة");
    else toast.error("تعذّر إرسال الإشعار التجريبي");
  };

  const permissionLabel =
    permission === "granted" ? "مسموح" : permission === "denied" ? "مرفوض" : permission === "unsupported" ? "غير مدعوم" : "لم يُطلب بعد";
  const today = coords ? prayerTimesFor(coords, new Date(), prefs).filter((p) => p.key !== "sunrise") : [];
  const timeZone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  })();

  return (
    <Screen title="إعدادات الأذان" back="/adhan">
      <div className="screen__inner pb-10">
        <ListSection
          title="الموقع"
          footer="تُحسب المواقيت على جهازك من موقعك وطريقة الحساب المختارة، وتعمل بدون إنترنت بعد تحديد الموقع. إذا انتقلت إلى مدينة أخرى فحدّث الموقع."
        >
          <ListRow
            icon="location"
            label="موقعك الحالي"
            hint={coords ? place || "تم تحديد الموقع" : "لم يتم تحديد الموقع بعد"}
            trailing={
              <button type="button" className="btn btn-soft !min-h-9 !px-4 !text-sm" onClick={locate} disabled={locLoading} data-testid="update-location">
                {locLoading ? "جاري التحديد..." : coords ? "تحديث" : "تحديد"}
              </button>
            }
          />
          <ListRow icon="list" label="اختيار المدينة يدويًا" hint="بدون GPS — مدن المملكة" onClick={() => setCityOpen(true)} testId="choose-city" />
        </ListSection>

        <ListSection title="تنبيه الأذان">
          <ListRow
            icon="bell"
            gold
            label="تنبيهات الأذان"
            hint={snoozed ? snoozeLabel(prefs.snoozedUntil) : prefs.enabled ? "مفعّلة" : "غير مفعّلة"}
            trailing={<Switch checked={prefs.enabled} onChange={(v) => void setEnabled(v)} label="تنبيهات الأذان" testId="adhan-enabled" />}
          />
          {prefs.enabled &&
            (snoozed ? (
              <ListRow icon="refresh" label="استئناف الأذان" onClick={() => updateAdhanPrefs({ snoozedUntil: null })} testId="adhan-resume" />
            ) : (
              <ListRow icon="bellOff" label="إيقاف مؤقت" onClick={() => setSnoozeOpen(true)} testId="adhan-snooze" />
            ))}
          {platform === "android" && exact === "denied" && prefs.enabled && (
            <ListRow
              icon="clock"
              gold
              label="السماح بالتنبيه في الوقت الدقيق"
              hint="بدونه قد يؤخّر أندرويد تنبيه الأذان عدة دقائق"
              onClick={() => void openExactAlarmSettings()}
              testId="exact-alarm"
            />
          )}
        </ListSection>
        {permission === "denied" && (
          <p className="px-5 -mt-1 text-xs text-destructive">تم رفض إذن الإشعارات، افتح إعدادات الجهاز وأعد السماح.</p>
        )}

        {prefs.enabled && (
          <ListSection title="تنبيه قبل الأذان" footer="تنبيه إضافي بصوت الجهاز قبل الأذان بالمدة المختارة، ويبقى تنبيه الأذان في وقته.">
            <div className="px-4 py-3">
              <Segmented
                label="تنبيه قبل الأذان"
                value={String(prefs.reminderMinutes)}
                onChange={(v) => updateAdhanPrefs({ reminderMinutes: Number(v) })}
                options={[0, 5, 10, 15].map((m) => ({ value: String(m), label: m === 0 ? "بدون" : `${ar(m)} د` }))}
              />
            </div>
          </ListSection>
        )}

        <ListSection
          title="صوت التنبيه"
          footer={`${SOUND_FOOTER[platform][prefs.alertSound]} يتبع الصوت إعدادات جهازك: الوضع الصامت ووضع التركيز (عدم الإزعاج) ومستوى الصوت.`}
        >
          <div className="px-4 py-3">
            <Segmented<AlertSound>
              label="صوت التنبيه"
              value={prefs.alertSound}
              onChange={(v) => updateAdhanPrefs({ alertSound: v })}
              options={[
                { value: "adhan", label: "الأذان" },
                { value: "device", label: "صوت الجهاز" },
              ]}
            />
          </div>
        </ListSection>

        <ListSection title="المؤذن">
          {MUEZZINS.map((m) => {
            const selected = prefs.muezzinId === m.id;
            const playing = player.playing === m.id;
            return (
              <div key={m.id} className="list-row list-row--plain">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className="flex-1 flex items-center gap-3 text-right min-h-11"
                  onClick={() => updateAdhanPrefs({ muezzinId: m.id })}
                  data-testid={`muezzin-${m.id}`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex-none w-6 h-6 rounded-full border-2 grid place-items-center ${
                      selected ? "border-primary bg-primary dark:border-gold dark:bg-gold" : "border-muted-foreground/40"
                    }`}
                  >
                    {selected && <Icon name="check" size={14} strokeWidth={3} className="text-primary-foreground dark:text-[hsl(156_40%_8%)]" />}
                  </span>
                  <span className="list-row__body">
                    <span className="list-row__label block">{m.name}</span>
                    <span className="list-row__hint block">{m.hint}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-soft !min-h-9 !px-4 !text-sm"
                  onClick={() => void preview(m.id, m.audioUrl)}
                  aria-label={playing ? `إيقاف ${m.name}` : `استماع ${m.name}`}
                  data-testid={`preview-${m.id}`}
                >
                  {playing ? "إيقاف" : "استماع"}
                </button>
              </div>
            );
          })}
        </ListSection>

        <ListSection
          title="طريقة الحساب"
          footer="أم القرى: الفجر بزاوية ١٨٫٥°، والعشاء بعد المغرب بـ٩٠ دقيقة (١٢٠ دقيقة في رمضان). قد يختلف التقويم الرسمي لمدينتك دقيقة أو دقيقتين بسبب الإحداثيات المعتمدة والتقريب."
        >
          <div className="list-row list-row--plain">
            <label htmlFor="calc-method" className="list-row__body list-row__label">
              الطريقة
            </label>
            <select
              id="calc-method"
              value={prefs.calcMethod}
              onChange={(e) => updateAdhanPrefs({ calcMethod: e.target.value })}
              className="time-value max-w-[58%]"
              dir="rtl"
              data-testid="calc-method"
            >
              {CALC_METHODS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="px-4 py-3">
            <p className="text-sm font-bold text-foreground mb-2">حساب العصر</p>
            <Segmented
              label="حساب العصر"
              value={prefs.madhab === "Hanafi" ? "Hanafi" : "Shafi"}
              onChange={(v) => updateAdhanPrefs({ madhab: v })}
              options={[
                { value: "Shafi", label: "الجمهور (الافتراضي)" },
                { value: "Hanafi", label: "حنفي" },
              ]}
            />
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              الجمهور (الشافعي والمالكي والحنبلي، المعمول به في المملكة): حين يصير ظل الشيء مثله. الحنفي: حين يصير مثليه، فيتأخر العصر.
            </p>
          </div>
        </ListSection>

        {native && (
          <ListSection title="حالة التنبيهات" footer="للتأكد من وصول التنبيهات على جهازك. لا تُعرض الإحداثيات هنا.">
            <ListRow label="إذن الإشعارات" value={permissionLabel} />
            {platform === "android" && <ListRow label="التنبيه في الوقت الدقيق" value={exact === "granted" ? "مسموح" : exact === "denied" ? "غير مسموح" : "—"} />}
            {timeZone && <ListRow label="المنطقة الزمنية للجهاز" value={<span dir="ltr">{timeZone}</span>} />}
            <ListRow icon="bell" label="إرسال إشعار تجريبي" hint="بالصوت والمؤذن المختارين، بعد ٥ ثوانٍ" onClick={() => void test()} testId="test-notification" />
            <ListRow icon="info" label="عرض التنبيهات المجدولة" onClick={() => void loadDiagnostics()} testId="load-diagnostics" />
            {diag && (
              <div className="px-4 py-3 text-xs leading-relaxed" data-testid="diagnostics">
                <p className="font-bold mb-1">
                  المجدول على الجهاز: {ar(diag.total)} إشعار، منها {ar(diag.prayer.length)} للصلاة
                </p>
                {today.length > 0 && (
                  <p className="text-muted-foreground mb-2">
                    مواقيت اليوم: {today.map((t) => `${PRAYER_LABEL[t.key as PrayerKey]} ${clock(t.time).time}`).join(" · ")}
                  </p>
                )}
                <ul className="space-y-1" dir="rtl">
                  {diag.prayer.slice(0, 12).map((n) => (
                    <li key={n.id} className="flex gap-2 justify-between">
                      <span>{n.title}</span>
                      <span dir="ltr" className="tabular-nums text-muted-foreground">
                        #{n.id} · {timeLabel(n.at)}
                        {n.prayerTime && n.at && n.prayerTime.getTime() !== n.at.getTime() ? ` (الأذان ${clock(n.prayerTime).time})` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="font-bold mt-3 mb-1" data-testid="diagnostics-reminders">
                  التذكيرات اليومية المجدولة: {diag.reminders.length ? "" : "لا يوجد"}
                </p>
                <ul className="space-y-1" dir="rtl">
                  {diag.reminders.map((n) => (
                    <li key={n.id} className="flex gap-2 justify-between">
                      <span>{n.title}</span>
                      <span dir="ltr" className="tabular-nums text-muted-foreground">
                        #{n.id} · {n.time}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </ListSection>
        )}
      </div>

      <Sheet open={snoozeOpen} onClose={() => setSnoozeOpen(false)} title="مدة الإيقاف">
        <div className="list-group -mx-1 mb-2">
          {SNOOZE_OPTIONS.map((o) => (
            <ListRow key={String(o.days)} label={o.label} onClick={() => snooze(o.days)} chevron={false} />
          ))}
        </div>
      </Sheet>

      <Sheet open={cityOpen} onClose={() => setCityOpen(false)} title="اختر مدينتك">
        <div className="list-group -mx-1 mb-2 max-h-[60vh] overflow-y-auto">
          {SAUDI_CITIES.map((c) => (
            <ListRow
              key={c.id}
              label={c.name}
              hint={c.region}
              chevron={false}
              testId={`city-${c.id}`}
              onClick={() => {
                setManualLocation(c.coords, c.name);
                setCityOpen(false);
                toast.success(`تم اختيار ${c.name}`);
              }}
            />
          ))}
        </div>
      </Sheet>
    </Screen>
  );
}
