import { Link, useLocation } from "wouter";
import { Icon, type IconName } from "@/components/icons/Icon";
import { useChromeHidden } from "./chrome";

export interface TabItem {
  href: string;
  label: string;
  icon: IconName;
  /** Other route prefixes that belong to this tab. */
  match: string[];
}

// Order follows the reference app, right to left in RTL.
export const TABS: TabItem[] = [
  { href: "/", label: "ورد اليوم", icon: "book", match: ["/khatmah"] },
  { href: "/athkar", label: "الأذكار", icon: "star8", match: ["/athkar", "/dhikr"] },
  { href: "/adhan", label: "الصلاة", icon: "mosque", match: ["/adhan"] },
  { href: "/index", label: "الفهرس", icon: "list", match: ["/index", "/surahs", "/juz", "/search", "/mushaf"] },
  {
    href: "/more",
    label: "المزيد",
    icon: "more",
    match: ["/more", "/settings", "/about", "/bookmarks", "/favorites", "/tafsir-translations", "/reminders"],
  },
];

export function activeTab(location: string): string {
  if (location === "/") return "/";
  const found = TABS.find((t) => t.href !== "/" && t.match.some((m) => location === m || location.startsWith(m + "/")));
  if (found) return found.href;
  return TABS.find((t) => t.match.some((m) => location.startsWith(m)))?.href ?? "/";
}

export default function TabBar() {
  const [location] = useLocation();
  const hidden = useChromeHidden();
  const current = activeTab(location);

  return (
    <nav
      className={`tabbar ${hidden ? "tabbar--hidden" : ""}`}
      aria-label="التنقل الرئيسي"
      aria-hidden={hidden || undefined}
      data-testid="tabbar"
    >
      <ul className="tabbar__list">
        {TABS.map((tab) => {
          const active = tab.href === current;
          return (
            <li key={tab.href} className="tabbar__item">
              <Link
                href={tab.href}
                className={`tabbar__link ${active ? "is-active" : ""}`}
                aria-current={active ? "page" : undefined}
                tabIndex={hidden ? -1 : undefined}
              >
                <span className="tabbar__icon">
                  <Icon name={tab.icon} size={25} strokeWidth={active ? 1.9 : 1.6} />
                </span>
                <span className="tabbar__label">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
