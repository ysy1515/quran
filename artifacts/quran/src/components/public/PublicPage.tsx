import { useEffect, type ReactNode } from "react";
import { BRAND, BrandIcon } from "@/components/brand/Brand";

// Layout for the public web pages (/support, /privacy) that App Store review and
// visitors open directly. They render outside the app shell: no tab bar, no
// splash and no app effects, and they scroll like a normal web page. Colours are
// the brand's own, so they look the same whatever theme a visitor last chose.

/** A path inside the site, respecting the deployment base path. */
export function sitePath(path: string): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "") + path;
}

export function mailtoHref(email: string, subject: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

const LINK = "font-semibold text-[#0B3D2A] underline decoration-[#D6AE5C] underline-offset-4 hover:decoration-2";

export function TextLink({ href, children, testId, external }: { href: string; children: ReactNode; testId?: string; external?: boolean }) {
  return (
    <a href={href} className={LINK} data-testid={testId} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

/** The support address as an inline mailto link. */
export function EmailLink({ email, subject, testId }: { email: string; subject: string; testId?: string }) {
  return (
    <a href={mailtoHref(email, subject)} dir="ltr" className={`${LINK} break-all`} data-testid={testId}>
      {email}
    </a>
  );
}

/** The support address as a large button. */
export function EmailButton({ email, subject, testId }: { email: string; subject: string; testId?: string }) {
  return (
    <a
      href={mailtoHref(email, subject)}
      className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#145A3E] to-[#0B3D2A] px-5 py-3.5 text-[#F6F0E1] font-bold shadow-[0_6px_16px_rgba(11,61,42,0.25)] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D6AE5C]"
      data-testid={testId}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none text-[#D6AE5C]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m4 7 8 6 8-6" />
      </svg>
      <span dir="ltr" className="break-all">{email}</span>
    </a>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="rounded-2xl bg-white border border-[#E8DFC8] shadow-[0_1px_2px_rgba(11,61,42,0.04),0_8px_24px_rgba(11,61,42,0.06)] p-5 sm:p-7"
    >
      <h2 id={`${id}-title`} className="flex items-center gap-3 text-lg sm:text-xl font-bold text-[#0B3D2A] mb-3">
        <span aria-hidden="true" className="h-6 w-1.5 flex-none rounded-full bg-gradient-to-b from-[#F1D894] to-[#A97C2F]" />
        {title}
      </h2>
      <div className="text-[15px] sm:text-base leading-8 text-[#2B3A33] space-y-3">{children}</div>
    </section>
  );
}

/** A bulleted list with the brand's gold diamond markers. */
export function BulletList({ items, columns = false }: { items: ReactNode[]; columns?: boolean }) {
  return (
    <ul className={`grid gap-2 ${columns ? "sm:grid-cols-2" : ""}`}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span aria-hidden="true" className="mt-3 h-1.5 w-1.5 flex-none rotate-45 bg-[#C9A84C]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PublicPage({
  title,
  intro,
  testId,
  footerLinks,
  children,
}: {
  title: string;
  intro: ReactNode;
  testId: string;
  footerLinks: { href: string; label: string; testId?: string }[];
  children: ReactNode;
}) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#FAF7F2] text-[#1B2A23]" dir="rtl" lang="ar" data-testid={testId}>
      <header className="relative overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#145A3E_0%,#0B3D2A_55%,#062A1C_100%)] text-[#F6F0E1] pt-[max(env(safe-area-inset-top),2.5rem)] pb-10 sm:pb-14 px-4">
        <div className="mx-auto max-w-3xl flex flex-col items-center text-center">
          <BrandIcon size={84} />
          <p className="brand-wordmark text-[#D6AE5C] text-4xl sm:text-5xl mt-4">{BRAND.name}</p>
          <p className="mt-1 text-base sm:text-lg font-semibold text-[#F1D894]">{BRAND.tagline}</p>
          <div aria-hidden="true" className="mt-6 h-px w-24 bg-gradient-to-l from-transparent via-[#D6AE5C] to-transparent" />
          <h1 className="mt-6 text-2xl sm:text-3xl font-bold">{title}</h1>
          <div className="mt-3 max-w-xl text-sm sm:text-base leading-7 text-[#F6F0E1]/85">{intro}</div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 -mt-6 pb-12 space-y-5">{children}</main>

      <footer className="border-t border-[#E8DFC8] px-4 pt-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] text-center text-sm text-[#5B6B63]">
        <div className="flex items-center justify-center gap-2">
          <BrandIcon size={28} />
          <span className="brand-wordmark text-[#0B3D2A] text-lg">{BRAND.name}</span>
          <span aria-hidden="true">·</span>
          <span>{BRAND.tagline}</span>
        </div>
        <nav aria-label="روابط الموقع" className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {footerLinks.map((l) => (
            <a key={l.href} href={l.href} className="text-[#0B3D2A] underline decoration-[#D6AE5C] underline-offset-4" data-testid={l.testId}>
              {l.label}
            </a>
          ))}
        </nav>
      </footer>
    </div>
  );
}
