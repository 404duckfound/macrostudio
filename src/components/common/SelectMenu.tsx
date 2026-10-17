import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  meta?: string;
  dot?: "ok" | "error";
}

interface SelectMenuProps {
  label: string;
  value: string | null;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
  onSelect: (value: string) => void;
}

export default function SelectMenu({
  label,
  value,
  options,
  placeholder,
  disabled,
  onSelect,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? null;

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onDocKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [open]);

  return (
    <div className="select-menu" ref={wrapRef}>
      <button
        type="button"
        className={`select-menu-btn ${open ? "select-menu-btn-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="select-menu-btn-text">
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="select-menu-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="select-menu-list" role="listbox" aria-label={label}>
          {options.length === 0 && <div className="select-menu-empty">None yet</div>}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`select-menu-item ${
                o.value === value ? "select-menu-item-active" : ""
              }`}
              onClick={() => {
                setOpen(false);
                onSelect(o.value);
              }}
            >
              {o.dot && (
                <span
                  className={`select-menu-dot ${
                    o.dot === "error" ? "select-menu-dot-error" : ""
                  }`}
                  aria-hidden="true"
                />
              )}
              <span className="select-menu-item-body">
                <span className="select-menu-item-label">{o.label}</span>
                {o.meta && <span className="select-menu-item-meta">{o.meta}</span>}
              </span>
              {o.value === value && <Check className="select-menu-check" aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}