import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ReactNode } from "react";
import { Check, ChevronDown, MoreHorizontal, Star } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
  meta?: string;
  dot?: "ok" | "error";
  /** Marks the default profile, rendered as an icon rather than text. */
  starred?: boolean;
  /** Tooltip/accessible name for the engine status dot. */
  dotLabel?: string;
}

interface SelectMenuProps {
  label: string;
  value: string | null;
  options: SelectOption[];
  placeholder: string;
  disabled?: boolean;
  onSelect: (value: string) => void;
  /** Extra action rendered at the bottom of the list, after a divider. */
  footerAction?: { label: string; icon?: ReactNode; onRun: () => void };
  /**
   * Per-option menu, rendered in place of the row when open. The callback
   * returns the menu content; the menu itself is positioned by the caller.
   */
  renderOptionActions?: (value: string, close: () => void) => ReactNode;
}

export default function SelectMenu({
  label,
  value,
  options,
  placeholder,
  disabled,
  onSelect,
  footerAction,
  renderOptionActions,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const [actionFor, setActionFor] = useState<string | null>(null);
  const [actionPos, setActionPos] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Options are a roving tab stop: exactly one row is in the tab order and the
  // arrow keys move that focus, the way a listbox is meant to behave.
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusOnOpen = useRef(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();

  // Fixed-position menu anchored to the "..." button: the list is a scroll
  // container, so an absolutely positioned child would be clipped by it.
  function openActions(value: string, anchor: HTMLButtonElement) {
    const r = anchor.getBoundingClientRect();
    setActionPos({ top: r.bottom + 4, left: r.right });
    setActionFor(value);
  }

  function closeActions() {
    setActionFor(null);
    setActionPos(null);
  }
  const selected = options.find((o) => o.value === value) ?? null;

  function focusOption(index: number) {
    const option = options[index];
    if (!option) return;
    setActiveIndex(index);
    optionRefs.current.get(option.value)?.focus();
  }

  // Opening from the keyboard puts focus on the selected row (or the first
  // one), so the next arrow key moves from where the user already is. Opening
  // with the mouse leaves focus on the trigger - a click should not teleport
  // the caret.
  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
      return;
    }
    const selectedIndex = options.findIndex((o) => o.value === value);
    const first = selectedIndex >= 0 ? selectedIndex : options.length > 0 ? 0 : -1;
    setActiveIndex(first);
    if (focusOnOpen.current) {
      focusOnOpen.current = false;
      const option = options[first];
      if (option) optionRefs.current.get(option.value)?.focus();
    }
    // Runs on the open transition only: while the list is open the rows are
    // rebuilt by the same render, and re-focusing would fight the pointer.
  }, [open]);

  function onButtonKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    if (!open) {
      focusOnOpen.current = true;
      setOpen(true);
      return;
    }
    if (options.length === 0) return;
    const next =
      e.key === "ArrowDown"
        ? Math.min(activeIndex + 1, options.length - 1)
        : Math.max(activeIndex - 1, 0);
    focusOption(next);
  }

  function onListKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusOption(Math.min(activeIndex + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusOption(Math.max(activeIndex - 1, 0));
    } else if (e.key === "Home") {
      e.preventDefault();
      focusOption(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focusOption(options.length - 1);
    }
    // Enter and Space need no branch: every row is a real <button>, so the
    // browser turns both into the row's click. A focused "..." button keeps
    // opening its own menu instead of picking the row.
  }

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActionFor(null);
      }
    }
    function onDocKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        // Escape peels one layer at a time: the option menu first, then the list.
        if (actionFor !== null) setActionFor(null);
        else {
          setOpen(false);
          // Keyboard users are inside the list; hand the focus back to the trigger.
          if (listRef.current?.contains(document.activeElement)) btnRef.current?.focus();
        }
      }
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [open, actionFor]);

  return (
    <div className="select-menu" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={`select-menu-btn ${open ? "select-menu-btn-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKeyDown}
      >
        <span className="select-menu-btn-body">
          <span className="select-menu-btn-text">
            {selected?.dot && (
              <span
                className={`select-menu-dot ${
                  selected.dot === "error" ? "select-menu-dot-error" : ""
                }`}
                role="img"
                aria-label={selected.dotLabel}
                title={selected.dotLabel}
              />
            )}
            {selected ? selected.label : placeholder}
            {selected?.starred && (
              <Star
                className="select-menu-star"
                aria-label="Default profile"
                fill="currentColor"
              />
            )}
          </span>
          {selected?.meta && (
            <span className="select-menu-btn-meta">{selected.meta}</span>
          )}
        </span>
        <ChevronDown className="select-menu-chevron" aria-hidden="true" />
      </button>
      {open && actionFor && actionPos && renderOptionActions && (
        <div
          className="rail-menu rail-menu-inline"
          style={{ top: actionPos.top, left: actionPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {renderOptionActions(actionFor, closeActions)}
        </div>
      )}
      {open && (
        <div
          className="select-menu-list"
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          onKeyDown={onListKeyDown}
        >
          {options.length === 0 && <div className="select-menu-empty">None yet</div>}
          {options.map((o, index) => {
            const menuOpen = actionFor === o.value;
            return (
              <div
                key={o.value}
                className={`select-menu-row ${
                  menuOpen ? "select-menu-row-open" : ""
                } ${o.value === value ? "select-menu-row-active" : ""}`}
              >
                <div className="select-menu-row-line">
                  <button
                    ref={(el) => {
                      if (el) optionRefs.current.set(o.value, el);
                      else optionRefs.current.delete(o.value);
                    }}
                    type="button"
                    role="option"
                    aria-selected={o.value === value}
                    tabIndex={index === activeIndex ? 0 : -1}
                    onFocus={() => setActiveIndex(index)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`select-menu-item ${
                      o.value === value ? "select-menu-item-active" : ""
                    }`}
                    onClick={() => {
                      setOpen(false);
                      onSelect(o.value);
                      // The row is about to unmount; without this the focus
                      // falls back to <body> and Tab restarts from the top.
                      btnRef.current?.focus();
                    }}
                  >
                    {o.dot && (
                      <span
                        className={`select-menu-dot ${
                          o.dot === "error" ? "select-menu-dot-error" : ""
                        }`}
                        role="img"
                        aria-label={o.dotLabel}
                        title={o.dotLabel}
                      />
                    )}
                    <span className="select-menu-item-body">
                      <span className="select-menu-item-label">
                        {o.label}
                        {o.starred && (
                          <Star
                            className="select-menu-star"
                            aria-label="Default profile"
                            fill="currentColor"
                          />
                        )}
                      </span>
                      {o.meta && <span className="select-menu-item-meta">{o.meta}</span>}
                    </span>
                    {o.value === value && (
                      <Check className="select-menu-check" aria-hidden="true" />
                    )}
                  </button>
                  {renderOptionActions && (
                    <button
                      type="button"
                      className={`select-menu-more ${
                        menuOpen ? "select-menu-more-open" : ""
                      }`}
                      aria-label={`${o.label} options`}
                      aria-expanded={menuOpen}
                      title="Options"
                      onClick={(e) => {
                        if (menuOpen) closeActions();
                        else openActions(o.value, e.currentTarget);
                      }}
                    >
                      <MoreHorizontal aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {footerAction && (
            <>
              <div className="rail-menu-divider" />
              <button
                type="button"
                className="select-menu-item select-menu-footer-action"
                onClick={() => {
                  setOpen(false);
                  footerAction.onRun();
                  btnRef.current?.focus();
                }}
              >
                {footerAction.icon}
                <span className="select-menu-item-label">{footerAction.label}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}