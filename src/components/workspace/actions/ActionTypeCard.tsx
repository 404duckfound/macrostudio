import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  CodeXml,
  Keyboard,
  Mouse,
  Play,
  Search,
  Type,
} from "lucide-react";
import type { MacroAction } from "../../../types";

export type ActionTypeValue = MacroAction["type"];

interface ActionTypeMeta {
  value: ActionTypeValue;
  title: string;
  badge: string;
  desc: string;
}

export const ACTION_TYPES: ActionTypeMeta[] = [
  {
    value: "key",
    title: "Keyboard Press",
    badge: "Input",
    desc: "Emulate physical keystroke or key combo",
  },
  {
    value: "keys",
    title: "Type Text",
    badge: "Input",
    desc: "Send a literal string of text",
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
  if (value === "key") return <Keyboard aria-hidden="true" />;
  if (value === "keys") return <Type aria-hidden="true" />;
  if (value === "mouse") return <Mouse aria-hidden="true" />;
  if (value === "custom") return <Play aria-hidden="true" />;
  return <CodeXml aria-hidden="true" />;
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
          {open ? <ChevronUp /> : <ChevronDown />}
        </span>
      </button>
      {open && !disabled && (
        <div className="action-select-pop" role="listbox">
          <div className="action-search-row">
            <span className="action-search-icon" aria-hidden="true">
              <Search />
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
                    <Check />
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
