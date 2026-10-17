import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Screen from "@/components/shell/Screen";
import { ListSection, ListRow, Segmented, Switch } from "@/components/kit/List";
import Sheet from "@/components/kit/Sheet";
import { Icon } from "@/components/icons/Icon";
import { useLocalNotifications } from "@/hooks/useLocalNotifications";
import { isSnoozed, requestLocation, updateAdhanPrefs, useAdhanPrefs, useCoords, usePlace } from "@/lib/prayer";
import { ar } from "@/lib/format";

// Only the 5 MP3 files actually uploaded to public/audio/adhan/
const MUEZZINS = [1, 2, 3, 4, 5].map((n) => ({
  id: `adhan-${n}`,
  name: `أذان ${ar(n)}`,
  hint: ["النمط الأول", "النمط الثاني", "النمط الثالث", "النمط الرابع", "النمط الخامس"][n - 1]!,
  audioUrl: `/audio/adhan/adhan-${n}.mp3`,
}));

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

export default function AdhanSettings() {
  const prefs = useAdhanPrefs();
  const coords = useCoords();
  const place = usePlace();
  const { permission, requestPermission, cancelAllPrayer } = useLocalNotifications();
  const [locLoading, setLocLoading] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const snoozed = isSnoozed(prefs.snoozedUntil);

  const stopAudio = () => {
    audio.current?.pause();
    if (audio.current) audio.current.src = "";
    setPlaying(null);
  };
  useEffect(() => () => stopAudio(), []);

  const preview = (id: string, url: string) => {
    if (playing === id) return stopAudio();
    stopAudio();
    const a = new Audio(url);
    audio.current = a;
    a.onended = () => setPlaying(null);
    a.onerror = () => {
      setPlaying(null);
      toast.error("تعذّر تشغيل الأذان، يرجى المحاولة لاحقاً");
    };
    setPlaying(id);
    a.play().catch((err: unknown) => {
      setPlaying(null);
      if (!(err instanceof DOMException && err.name === "AbortError")) toast.error("ملف الأذان غير متوفر حالياً");
    });
  };

  const locate = async () => {
    setLocLoading(true);
    try {
      await requestLocation();
      toast.success("تم تحديد الموقع");
    } catch (err) {
      const denied = (err as GeolocationPositionError)?.code === 1;
      toast.error(denied ? "تم رفض الوصول إلى الموقع، يرجى السماح من الإعدادات" : "تعذّر تحديد الموقع");
    } finally {
      setLocLoading(false);
    }
  };

  const setEnabled = async (on: boolean) => {
    if (!on) {
      updateAdhanPrefs({ enabled: false });
      await cancelAllPrayer();
      toast("تم إيقاف تذكيرات الصلاة");
      return;
    }
    if (!coords) {
      await locate();
      return;
    }
    if (!(await requestPermission())) {
      toast.error("لم يتم منح إذن الإشعارات، يرجى السماح من إعدادات الجهاز");
      return;
    }
    updateAdhanPrefs({ enabled: true, snoozedUntil: null });
    toast.success("تم تفعيل تذكيرات الصلاة");
  };

  const snooze = (days: number | "forever") => {
    updateAdhanPrefs({ snoozedUntil: days === "forever" ? -1 : Date.now() + days * 86400000 });
    setSnoozeOpen(false);
    toast.success(days === "forever" ? "تم إيقاف الأذان حتى التفعيل اليدوي" : `تم إيقاف الأذان ${ar(days)} أيام`);
  };

  return (
    <Screen title="إعدادات الأذان" back="/adhan">
      <div className="screen__inner pb-10">
        <ListSection title="الموقع" footer="يُحسب الأذان باستخدام موقعك الجغرافي وفق الطريقة المختارة، ويعمل بدون اتصال بالإنترنت بعد تحديد الموقع.">
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
        </ListSection>

        <ListSection title="تنبيه الأذان">
          <ListRow
            icon="bell"
            gold
            label="تذكير الأذان"
            hint={snoozed ? snoozeLabel(prefs.snoozedUntil) : prefs.enabled ? "مفعّل" : "غير مفعّل"}
            trailing={<Switch checked={prefs.enabled} onChange={(v) => void setEnabled(v)} label="تذكير الأذان" testId="adhan-enabled" />}
          />
          {prefs.enabled &&
            (snoozed ? (
              <ListRow icon="refresh" label="استئناف الأذان" onClick={() => updateAdhanPrefs({ snoozedUntil: null })} testId="adhan-resume" />
            ) : (
              <ListRow icon="bellOff" label="إيقاف مؤقت" onClick={() => setSnoozeOpen(true)} testId="adhan-snooze" />
            ))}
        </ListSection>
        {permission === "denied" && (
          <p className="px-5 -mt-1 text-xs text-destructive">تم رفض إذن الإشعارات، افتح إعدادات الجهاز وأعد السماح.</p>
        )}

        {prefs.enabled && (
          <ListSection title="وقت التذكير" footer="قد يختلف صوت الإشعار حسب قيود iOS، والصوت الافتراضي للجهاز هو الأكثر موثوقية.">
            <div className="px-4 py-3">
              <Segmented
                label="أرسل التنبيه قبل وقت الصلاة"
                value={String(prefs.reminderMinutes)}
                onChange={(v) => updateAdhanPrefs({ reminderMinutes: Number(v) })}
                options={[0, 5, 10, 15].map((m) => ({ value: String(m), label: m === 0 ? "عند الأذان" : `${ar(m)} د` }))}
              />
            </div>
          </ListSection>
        )}

        <ListSection title="صوت الأذان">
          {MUEZZINS.map((m) => {
            const selected = prefs.muezzinId === m.id;
            return (
              <div key={m.id} className="list-row list-row--plain">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className="flex-1 flex items-center gap-3 text-right min-h-11"
                  onClick={() => updateAdhanPrefs({ muezzinId: m.id })}
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
                  onClick={() => preview(m.id, m.audioUrl)}
                  aria-label={playing === m.id ? `إيقاف ${m.name}` : `استماع ${m.name}`}
                >
                  {playing === m.id ? "إيقاف" : "استماع"}
                </button>
              </div>
            );
          })}
        </ListSection>

        <ListSection title="طريقة الحساب">
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
                { value: "Shafi", label: "شافعي / مالكي" },
                { value: "Hanafi", label: "حنفي" },
              ]}
            />
          </div>
        </ListSection>
      </div>

      <Sheet open={snoozeOpen} onClose={() => setSnoozeOpen(false)} title="مدة الإيقاف">
        <div className="list-group -mx-1 mb-2">
          {SNOOZE_OPTIONS.map((o) => (
            <ListRow key={String(o.days)} label={o.label} onClick={() => snooze(o.days)} chevron={false} />
          ))}
        </div>
      </Sheet>
    </Screen>
  );
}
