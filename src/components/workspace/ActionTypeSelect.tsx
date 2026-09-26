import { useEffect, useRef, useState } from "react";
import type { MacroAction } from "../../types";

export type ActionTypeValue = MacroAction["type"];

interface ActionTypeMeta {
  value: ActionTypeValue;
  title: string;
  badge: string;
  desc: string;
}

export const ACTION_TYPES: ActionTypeMeta[] = [
  {
    value: "keys",
    title: "Keyboard Press",
    badge: "Input",
    desc: "Send keys or keystroke block",
  },
  {
    value: "mouse",
    title: "Mouse Press",
    badge: "Input",
    desc: "Click with optional X/Y",
  },
  {
    value: "custom",
    title: "Custom",
    badge: "Automate",
    desc: "Keys + Mouse + Delay blocks",
  },
  {
    value: "script",
    title: "Script",
    badge: "Script",
    desc: "Raw AHK v2 code",
  },
];

function TypeIcon({ value }: { value: ActionTypeValue }) {
  if (value === "keys") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="2"
          y="5"
          width="20"
          height="14"
          rx="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M10 13h.01M14 13h.01M18 13h.01M7 16.5h10"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (value === "mouse") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="7"
          y="3"
          width="10"
          height="18"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <line
          x1="12"
          y1="3"
          x2="12"
          y2="9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (value === "custom") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 4.5v15l13-7.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8 6L3 12l5 6M16 6l5 6-5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ActionTypeSelect({
  value,
  disabled,
  onSelect,
}: {
  value: ActionTypeValue | "";
  disabled?: boolean;
  onSelect: (next: ActionTypeValue | "") => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? ACTION_TYPES.filter((t) =>
        `${t.title} ${t.badge} ${t.desc}`.toLowerCase().includes(q),
      )
    : ACTION_TYPES;

  const current = ACTION_TYPES.find((t) => t.value === value) ?? null;

  return (
    <div className="action-select" ref={rootRef}>
      <button
        type="button"
        className={`action-select-btn ${open ? "action-select-btn-open" : ""} ${current ? "action-select-btn-filled" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select action type"
        disabled={disabled}
        onClick={() => {
          setQuery("");
          setOpen((v) => !v);
        }}
      >
        {current ? (
          <>
            <span className="action-icon" aria-hidden="true">
              <TypeIcon value={current.value} />
            </span>
            <span className="action-text">
              <span className="action-title-row">
                <span className="action-title">{current.title}</span>
                <span className="action-badge">{current.badge}</span>
              </span>
              <span className="action-desc">{current.desc}</span>
            </span>
          </>
        ) : (
          <span className="action-placeholder">Select action type…</span>
        )}
        <span className="action-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d={open ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {open && !disabled && (
        <div className="action-select-pop" role="listbox">
          <div className="action-search-row">
            <span className="action-search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <line
                  x1="16.5"
                  y1="16.5"
                  x2="21"
                  y2="21"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              className="action-search"
              value={query}
              placeholder="Search action types..."
              aria-label="Search action types"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {filtered.map((t) => {
            const active = t.value === value;
            return (
              <button
                key={t.value}
                type="button"
                role="option"
                aria-selected={active}
                className={`action-option ${active ? "action-option-active" : ""}`}
                onClick={() => {
                  onSelect(t.value);
                  setOpen(false);
                }}
              >
                <span className="action-icon" aria-hidden="true">
                  <TypeIcon value={t.value} />
                </span>
                <span className="action-text">
                  <span className="action-title-row">
                    <span className="action-title">{t.title}</span>
                    <span className="action-badge">{t.badge}</span>
                  </span>
                  <span className="action-desc">{t.desc}</span>
                </span>
                {active && (
                  <span className="action-check" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M4 12.5l5 5L20 6.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="action-empty">No action types found.</div>
          )}
        </div>
      )}
    </div>
  );
}
