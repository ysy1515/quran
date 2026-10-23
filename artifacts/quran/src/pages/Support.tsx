import type { ReactNode } from "react";
import PublicPage, { BulletList, EmailButton, EmailLink, Section, TextLink, sitePath } from "@/components/public/PublicPage";
import { APP_CONFIG } from "@/lib/appConfig";

// Public support page: the App Store "Support URL".

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

export default function Support({ supportEmail = APP_CONFIG.supportEmail }: { supportEmail?: string }) {
  const subject = "دعم تطبيق مصحفك";
  return (
    <PublicPage
      title={SUPPORT_TITLE}
      intro="يسعدنا أن نساعدك. ستجد هنا إجابات الأسئلة الشائعة وطريقة التواصل معنا والإبلاغ عن أي مشكلة."
      testId="support-page"
      footerLinks={[
        { href: sitePath("/privacy"), label: "سياسة الخصوصية", testId: "footer-privacy-link" },
        { href: sitePath("/"), label: "افتح مصحفك على الويب" },
      ]}
    >
      {supportEmail && (
        <Section id="contact" title="التواصل مع الدعم">
          <p>
            لأي سؤال أو اقتراح أو مشكلة تواجهك في التطبيق، راسلنا على البريد الإلكتروني التالي، وسنرد عليك في أقرب وقت
            بإذن الله.
          </p>
          <EmailButton email={supportEmail} subject={subject} testId="support-email" />
        </Section>
      )}

      <Section id="about" title="عن مصحفك">
        <p>
          مصحفك تطبيق هادئ وأنيق يرافقك في قراءة القرآن الكريم كل يوم. يقسّم لك المصحف إلى أوراد يومية لتتمّ ختمتك،
          ويحفظ مواضع قراءتك، ويجمع إلى ذلك الأذكار ومواقيت الصلاة.
        </p>
        <BulletList
          columns
          items={[
            "قراءة المصحف بالرسم العثماني مع التفسير والترجمة",
            "ورد يومي وختمة تتابع تقدّمك فيها",
            "فواصل متعددة وآيات مفضلة",
            "أذكار الصباح والمساء وعداد التسبيح",
            "مواقيت الصلاة وتنبيه الأذان",
            "تذكير بالورد والأذكار في الوقت الذي تختاره",
          ]}
        />
      </Section>

      <Section id="report" title="الإبلاغ عن مشكلة">
        <p>
          إذا واجهت خطأً أو مشكلة تقنية فنرجو{" "}
          {supportEmail ? (
            <>
              مراسلتنا على <EmailLink email={supportEmail} subject="الإبلاغ عن مشكلة في تطبيق مصحفك" testId="report-email" />
            </>
          ) : (
            "مراسلتنا"
          )}{" "}
          مع ذكر ما يلي، فهذا يساعدنا على حلّها بسرعة:
        </p>
        <ol className="space-y-2 list-decimal pe-1 ps-5 marker:text-[#A97C2F] marker:font-bold">
          <li>وصف مختصر للمشكلة، والشاشة التي ظهرت فيها.</li>
          <li>الخطوات التي أدّت إليها، وهل تتكرر في كل مرة.</li>
          <li>
            طراز الجهاز وإصدار نظام التشغيل، مثل: <bdi dir="ltr" className="whitespace-nowrap">iPhone 15, iOS 18</bdi>.
          </li>
          <li>لقطة شاشة إن أمكن.</li>
        </ol>
        <p>
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
          لا يحتاج مصحفك إلى حساب، ولا يعرض إعلانات، وتبقى ختمتك وفواصلك ومفضلتك وإعداداتك على جهازك. يُستخدم موقعك
          بإذنك لحساب مواقيت الصلاة على الجهاز، ويمكنك إيقاف إذن الموقع في أي وقت من إعدادات جهازك.
        </p>
        <p>
          <TextLink href={sitePath("/privacy")} testId="privacy-link">
            اقرأ سياسة الخصوصية كاملة
          </TextLink>
        </p>
      </Section>
    </PublicPage>
  );
}
