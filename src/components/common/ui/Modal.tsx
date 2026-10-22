import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ title, subtitle, icon, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    // Land in the first form control, not on the header's close button: a modal
    // is opened to edit something, and the close X is the last thing wanted.
    const body = dialogRef.current?.querySelector<HTMLElement>(".modal-body");
    const initial =
      body?.querySelector<HTMLElement>("input, textarea, select") ??
      body?.querySelector<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])',
      ) ??
      dialogRef.current?.querySelector<HTMLElement>(".modal-x");
    initial?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide" ref={dialogRef} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div className="modal-head-left">
            {icon && (
              <span className="modal-icon" aria-hidden="true">
                {icon}
              </span>
            )}
            <span className="modal-title-wrap">
              <span className="modal-title">{title}</span>
              {subtitle && <span className="modal-subtitle">{subtitle}</span>}
            </span>
          </div>
          <button className="modal-x" type="button" aria-label="Close" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
