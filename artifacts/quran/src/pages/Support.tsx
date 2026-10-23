import { useEffect, type ReactNode } from "react";
import { BRAND, BrandIcon } from "@/components/brand/Brand";
import { APP_CONFIG } from "@/lib/appConfig";

// Public support page (the App Store "Support URL"). It renders outside the app
// shell: no tab bar, no splash and no app effects, and it scrolls like a normal
// web page. Colours are the brand's own, so it looks the same whatever theme a
// visitor last chose in the web app.

export const SUPPORT_TITLE = "الدعم والمساعدة – مصحفك";

const FAQ: { q: string; a: ReactNode }[] = [
  {
    q: "كيف أقرأ القرآن الكريم في التطبيق؟",
    a: "افتح تبويب «الفهرس» واختر السورة أو الجزء، فيُفتح المصحف على موضعه. اضغط على أي آية لعرض تفسيرها وترجمتها، أو لإضافتها إلى الفواصل أو المفضلة. ويعود بك التطبيق إلى آخر موضع قرأت فيه.",
  },
  {
    q: "كيف أحفظ موضع قراءتي بالفواصل؟",
    a: "اضغط على الآية في المصحف ثم اختر «إضافة فاصل». يمكنك حفظ أكثر من فاصل، وتجدها كلها في «المزيد» ثم «الفواصل»، ومنها تعود إلى الآية مباشرة. وللآيات التي تحب الرجوع إليها اختر «إلى المفضلة».",
  },
  {
    q: "كيف أبدأ ختمة وأتابع تقدّمي فيها؟",
    a: "من تبويب «ورد اليوم» اختر «بدء ختمة جديدة»، وحدّد مدة الختمة، فيقسّم التطبيق المصحف إلى أوراد يومية. علّم الورد بعد قراءته ليُحسب تقدّمك. الختمة الكاملة تبدأ من أول المصحف، فإن بدأت من جزء آخر صارت خطة قراءة إلى آخر المصحف، وتُسجّل عند إتمامها خطة مكتملة لا ختمة كاملة.",
  },
  {
    q: "لماذا لا تصلني الإشعارات؟",
    a: "تأكّد أولًا من السماح بالإشعارات لتطبيق مصحفك من «الإعدادات» في جهازك ثم «الإشعارات». فعّل بعد ذلك تنبيه الأذان من تبويب «الصلاة»، وتذكير الورد وأذكار الصباح والمساء من «المزيد» ثم «التذكيرات». تُجدول التنبيهات لليومين القادمين وتتجدد عند فتح التطبيق، فافتحه مرة على الأقل كل يومين.",
  },
  {
    q: "كيف تُحسب مواقيت الصلاة؟ وكيف أعدّلها؟",
    a: "تُحسب المواقيت على الجهاز بحسب موقعك بعد إذنك. ومن إعدادات الصلاة يمكنك تغيير الموقع وطريقة الحساب وصوت الأذان، واختيار حساب العصر على المذهب الشافعي والمالكي (الافتراضي) أو الحنفي. إذا بدا لك وقت غير دقيق فتحقّق من الموقع وطريقة الحساب أولًا.",
  },
  {
    q: "هل أحتاج إلى حساب؟ وأين تُحفظ بياناتي؟",
    a: "لا يحتاج مصحفك إلى تسجيل حساب. تُحفظ ختمتك وفواصلك ومفضلتك وإعداداتك على جهازك، لذلك يؤدي حذف التطبيق إلى حذفها.",
  },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="rounded-2xl bg-white border border-[#E8DFC8] shadow-[0_1px_2px_rgba(11,61,42,0.04),0_8px_24px_rgba(11,61,42,0.06)] p-5 sm:p-7"
    >
      <h2 id={`${id}-title`} className="flex items-center gap-3 text-lg sm:text-xl font-bold text-[#0B3D2A] mb-3">
        <span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-gradient-to-b from-[#F1D894] to-[#A97C2F]" />
        {title}
      </h2>
      <div className="text-[15px] sm:text-base leading-8 text-[#2B3A33]">{children}</div>
    </section>
  );
}

export default function Support({
  supportEmail = APP_CONFIG.supportEmail,
  privacyPolicyUrl = APP_CONFIG.privacyPolicyUrl,
}: {
  supportEmail?: string;
  privacyPolicyUrl?: string;
}) {
  useEffect(() => {
    const previous = document.title;
    document.title = SUPPORT_TITLE;
    return () => {
      document.title = previous;
    };
  }, []);

  const mailto = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent("دعم تطبيق مصحفك")}`
    : "";

  return (
    <div
      className="fixed inset-0 overflow-y-auto bg-[#FAF7F2] text-[#1B2A23]"
      dir="rtl"
      lang="ar"
      data-testid="support-page"
    >
      <header className="relative overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#145A3E_0%,#0B3D2A_55%,#062A1C_100%)] text-[#F6F0E1] pt-[max(env(safe-area-inset-top),2.5rem)] pb-10 sm:pb-14 px-4">
        <div className="mx-auto max-w-3xl flex flex-col items-center text-center">
          <BrandIcon size={84} />
          <p className="brand-wordmark text-[#D6AE5C] text-4xl sm:text-5xl mt-4">{BRAND.name}</p>
          <p className="mt-1 text-base sm:text-lg font-semibold text-[#F1D894]">{BRAND.tagline}</p>
          <div aria-hidden="true" className="mt-6 h-px w-24 bg-gradient-to-l from-transparent via-[#D6AE5C] to-transparent" />
          <h1 className="mt-6 text-2xl sm:text-3xl font-bold">{SUPPORT_TITLE}</h1>
          <p className="mt-3 max-w-xl text-sm sm:text-base leading-7 text-[#F6F0E1]/85">
            يسعدنا أن نساعدك. ستجد هنا إجابات الأسئلة الشائعة وطريقة التواصل معنا والإبلاغ عن أي مشكلة.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 -mt-6 pb-12 space-y-5">
        {supportEmail && (
          <Section id="contact" title="التواصل مع الدعم">
            <p>
              لأي سؤال أو اقتراح أو مشكلة تواجهك في التطبيق، راسلنا على البريد الإلكتروني التالي، وسنرد عليك في أقرب وقت
              بإذن الله.
            </p>
            <a
              href={mailto}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#145A3E] to-[#0B3D2A] px-5 py-3.5 text-[#F6F0E1] font-bold shadow-[0_6px_16px_rgba(11,61,42,0.25)] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6AE5C]"
              data-testid="support-email"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none text-[#D6AE5C]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2.5" />
                <path d="m4 7 8 6 8-6" />
              </svg>
              <span dir="ltr" className="break-all">{supportEmail}</span>
            </a>
          </Section>
        )}

        <Section id="about" title="عن مصحفك">
          <p>
            مصحفك تطبيق هادئ وأنيق يرافقك في قراءة القرآن الكريم كل يوم. يقسّم لك المصحف إلى أوراد يومية لتتمّ ختمتك،
            ويحفظ مواضع قراءتك، ويجمع إلى ذلك الأذكار ومواقيت الصلاة.
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              "قراءة المصحف بالرسم العثماني مع التفسير والترجمة",
              "ورد يومي وختمة تتابع تقدّمك فيها",
              "فواصل متعددة وآيات مفضلة",
              "أذكار الصباح والمساء وعداد التسبيح",
              "مواقيت الصلاة وتنبيه الأذان",
              "تذكير بالورد والأذكار في الوقت الذي تختاره",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-3 h-1.5 w-1.5 flex-none rotate-45 bg-[#C9A84C]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="report" title="الإبلاغ عن مشكلة">
          <p>
            إذا واجهت خطأً أو مشكلة تقنية فنرجو{" "}
            {supportEmail ? (
              <>
                مراسلتنا على{" "}
                <a href={mailto} dir="ltr" className="font-semibold text-[#0B3D2A] underline decoration-[#D6AE5C] underline-offset-4">
                  {supportEmail}
                </a>
              </>
            ) : (
              "مراسلتنا"
            )}{" "}
            مع ذكر ما يلي، فهذا يساعدنا على حلّها بسرعة:
          </p>
          <ol className="mt-3 space-y-2 list-decimal pe-1 ps-5 marker:text-[#A97C2F] marker:font-bold">
            <li>وصف مختصر للمشكلة، والشاشة التي ظهرت فيها.</li>
            <li>الخطوات التي أدّت إليها، وهل تتكرر في كل مرة.</li>
            <li>
              طراز الجهاز وإصدار نظام التشغيل، مثل: <bdi dir="ltr">iPhone 15, iOS 18</bdi>.
            </li>
            <li>لقطة شاشة إن أمكن.</li>
          </ol>
          <p className="mt-3">
            وإن لاحظت أي ملاحظة على نص آية أو تفسيرها فاذكر اسم السورة ورقم الآية، فنحن نعتني بمراجعة ذلك عناية خاصة.
          </p>
        </Section>

        <Section id="faq" title="الأسئلة الشائعة">
          <div className="divide-y divide-[#EFE7D4]">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group py-3 first:pt-0 last:pb-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 font-semibold text-[#0B3D2A] [&::-webkit-details-marker]:hidden">
                  <span>{q}</span>
                  <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none text-[#A97C2F] transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </summary>
                <p className="mt-2 text-[#3B4A43]">{a}</p>
              </details>
            ))}
          </div>
        </Section>

        <Section id="privacy" title="الخصوصية">
          <p>
            لا يحتاج مصحفك إلى حساب، وتبقى ختمتك وفواصلك ومفضلتك وإعداداتك على جهازك. يُستخدم موقعك بإذنك لحساب مواقيت
            الصلاة ومعرفة اسم مدينتك، ويمكنك إيقاف إذن الموقع في أي وقت من إعدادات جهازك.
          </p>
          {privacyPolicyUrl && (
            <a
              href={privacyPolicyUrl}
              className="mt-3 inline-block font-semibold text-[#0B3D2A] underline decoration-[#D6AE5C] underline-offset-4"
              data-testid="privacy-link"
            >
              اقرأ سياسة الخصوصية كاملة
            </a>
          )}
        </Section>
      </main>

      <footer className="border-t border-[#E8DFC8] px-4 pt-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] text-center text-sm text-[#5B6B63]">
        <div className="flex items-center justify-center gap-2">
          <BrandIcon size={28} />
          <span className="brand-wordmark text-[#0B3D2A] text-lg">{BRAND.name}</span>
          <span aria-hidden="true">·</span>
          <span>{BRAND.tagline}</span>
        </div>
        <p className="mt-2">
          <a href="/" className="text-[#0B3D2A] underline decoration-[#D6AE5C] underline-offset-4">
            افتح مصحفك على الويب
          </a>
        </p>
      </footer>
    </div>
  );
}
