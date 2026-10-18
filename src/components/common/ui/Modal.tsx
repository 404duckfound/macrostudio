import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ title, subtitle, icon, onClose, children }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide" role="dialog" aria-modal="true" aria-label={title}>
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
