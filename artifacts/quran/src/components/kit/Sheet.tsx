import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  labelledBy?: string;
}

/** Bottom sheet that respects the home-indicator safe area and returns focus on close. */
export default function Sheet({ open, onClose, title, children }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        dir="rtl"
        data-testid="sheet"
      >
        <div className="sheet__grip" aria-hidden="true" />
        {title && <h2 className="px-5 pt-1 pb-2 text-lg font-bold text-foreground">{title}</h2>}
        <div className="sheet__body">{children}</div>
      </div>
    </>,
    document.body,
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmSheet({ open, title, message, confirmLabel, danger, onConfirm, onClose }: ConfirmProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {message && <div className="text-sm text-muted-foreground leading-relaxed mb-5">{message}</div>}
      <div className="grid grid-cols-2 gap-3 pb-2">
        <button
          type="button"
          className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
          onClick={() => {
            onConfirm();
            onClose();
          }}
          data-testid="confirm-yes"
        >
          {confirmLabel}
        </button>
        <button type="button" className="btn btn-soft" onClick={onClose} data-testid="confirm-no">
          إلغاء
        </button>
      </div>
    </Sheet>
  );
}
