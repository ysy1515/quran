import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Icon } from "@/components/icons/Icon";
import { useChromeHidden } from "./chrome";

// Saved scroll positions, per route, for this app session.
const scrollPositions = new Map<string, number>();

export interface HeaderAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  pressed?: boolean;
  testId?: string;
}

interface ScreenProps {
  title: string;
  subtitle?: ReactNode;
  /** Show a back button. A string is the route to use when there is no history. */
  back?: string;
  /** Buttons at the right edge (after the back button), in RTL reading order. */
  startActions?: HeaderAction[];
  /** Buttons at the left edge. */
  endActions?: HeaderAction[];
  /** Extra header content under the title row (segmented control, hero). */
  headerExtra?: ReactNode;
  /** Larger header used by the prayer screen. */
  heroHeader?: boolean;
  /** Scroll container class (padding etc.). */
  bodyClassName?: string;
  children: ReactNode;
  /** Restore the scroll position when returning to this route. Default true. */
  restoreScroll?: boolean;
  onBodyScroll?: (el: HTMLElement) => void;
  bodyRef?: (el: HTMLElement | null) => void;
}

function HeaderButton({ action }: { action: HeaderAction }) {
  return (
    <button
      type="button"
      className="header-btn"
      onClick={action.onClick}
      aria-label={action.label}
      aria-pressed={action.pressed}
      data-testid={action.testId}
    >
      {action.icon}
    </button>
  );
}

// Number of in-app route changes this session (AppShell counts them), so the
// back button never leaves the app on a cold start or a deep link.
let inAppDepth = 0;
export function noteRouteChange() {
  inAppDepth += 1;
}

export function goBack(navigate: (to: string, opts?: { replace?: boolean }) => void, fallback: string) {
  if (inAppDepth > 1) {
    inAppDepth -= 2; // the pop below counts as one more route change
    window.history.back();
  } else {
    navigate(fallback, { replace: true });
  }
}

/**
 * One app screen: a fixed header and the only vertical scroll container. The
 * tab bar is a sibling rendered by AppShell, so content never sits under it.
 */
export default function Screen({
  title,
  subtitle,
  back,
  startActions = [],
  endActions = [],
  headerExtra,
  heroHeader,
  bodyClassName = "",
  children,
  restoreScroll = true,
  onBodyScroll,
  bodyRef,
}: ScreenProps) {
  const [location, navigate] = useLocation();
  const hidden = useChromeHidden();
  const body = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    if (restoreScroll) el.scrollTop = scrollPositions.get(location) ?? 0;
    return () => {
      scrollPositions.set(location, el.scrollTop);
    };
  }, [location, restoreScroll]);

  return (
    <section className="screen" data-testid="screen">
      <header
        className={`app-header ${heroHeader ? "app-header--hero" : ""} ${hidden ? "app-header--hidden" : ""}`}
        data-testid="app-header"
        aria-hidden={hidden || undefined}
      >
        <div className="app-header__row">
          <div className="app-header__side">
            {back !== undefined && (
              <button
                type="button"
                className="header-btn"
                aria-label="رجوع"
                onClick={() => goBack(navigate, back || "/")}
                data-testid="header-back"
              >
                <Icon name="chevronStart" size={26} strokeWidth={2} />
              </button>
            )}
            {startActions.map((a) => (
              <HeaderButton key={a.label} action={a} />
            ))}
          </div>
          <div className="app-header__title">
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <div className="app-header__side app-header__side--end">
            {endActions.map((a) => (
              <HeaderButton key={a.label} action={a} />
            ))}
          </div>
        </div>
        {headerExtra}
      </header>
      <main
        ref={(el) => {
          body.current = el;
          bodyRef?.(el);
        }}
        className={`screen__body ${bodyClassName}`}
        data-testid="screen-body"
        onScroll={onBodyScroll ? (e) => onBodyScroll(e.currentTarget) : undefined}
      >
        {children}
      </main>
    </section>
  );
}
