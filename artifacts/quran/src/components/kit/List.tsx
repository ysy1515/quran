import type { ReactNode } from "react";
import { Link } from "wouter";
import { Icon, type IconName } from "@/components/icons/Icon";

export function ListSection({ title, children, footer }: { title?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="list-section">
      {title && <h2 className="list-section__title">{title}</h2>}
      <div className="list-group">{children}</div>
      {footer && <p className="px-5 pt-2 text-xs text-muted-foreground leading-relaxed">{footer}</p>}
    </section>
  );
}

interface RowProps {
  label: ReactNode;
  hint?: ReactNode;
  icon?: IconName;
  gold?: boolean;
  value?: ReactNode;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
  disabled?: boolean;
  trailing?: ReactNode;
  testId?: string;
}

export function ListRow({ label, hint, icon, gold, value, href, onClick, chevron, disabled, trailing, testId }: RowProps) {
  const inner = (
    <>
      {icon && (
        <span className={`list-row__icon ${gold ? "list-row__icon--gold" : ""}`} aria-hidden="true">
          <Icon name={icon} size={18} strokeWidth={2} />
        </span>
      )}
      <span className="list-row__body">
        <span className="list-row__label block">{label}</span>
        {hint && <span className="list-row__hint block">{hint}</span>}
      </span>
      {value != null && <span className="list-row__value">{value}</span>}
      {trailing}
      {(chevron ?? !!(href || onClick)) && !trailing && (
        <Icon name="chevronEnd" size={20} className="list-row__chevron" />
      )}
    </>
  );
  const cls = `list-row ${icon ? "" : "list-row--plain"}`;
  if (href && !disabled) {
    return (
      <Link href={href} className={cls} data-testid={testId}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} disabled={disabled} aria-disabled={disabled} data-testid={testId}>
        {inner}
      </button>
    );
  }
  return (
    <div className={cls} aria-disabled={disabled} data-testid={testId}>
      {inner}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  testId,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      data-testid={testId}
      className={`relative flex-none w-[52px] h-[32px] rounded-full transition-colors duration-200 disabled:opacity-40 ${
        checked ? "bg-primary dark:bg-gold" : "bg-muted-foreground/25"
      }`}
    >
      <span
        className={`absolute top-[3px] w-[26px] h-[26px] rounded-full bg-white shadow-md transition-all duration-200 ${
          checked ? "right-[3px]" : "right-[23px]"
        }`}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
