import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import {
  KEY_CATEGORIES,
  buildCombo,
  keysInCategory,
  searchKeys,
  splitCombo,
  MODIFIERS,
  type KeyCategoryId,
} from "../../lib/keyCatalog";

interface KeyPickerProps {
  open: boolean;
  /** Current combo string; ticks two-way sync from its modifiers. */
  currentCombo: string;
  /** Trigger: false (uppercase rule). Action Key Press: true (case kept). */
  preserveCase: boolean;
  /** Trigger: true (hide MouseLeft). Action: false (include it). */
  excludeLeftMouse: boolean;
  onSelect: (combo: string) => void;
  onClose: () => void;
}

export default function KeyPicker({
  open,
  currentCombo,
  preserveCase,
  excludeLeftMouse,
  onSelect,
  onClose,
}: KeyPickerProps) {
  const [page, setPage] = useState<KeyCategoryId | null>(null);
  const [query, setQuery] = useState("");
  const [ticks, setTicks] = useState<string[]>([]);

  // Fresh page + search on each open.
  useEffect(() => {
    if (open) {
      setPage(null);
      setQuery("");
    }
  }, [open ]);

  // Two-way auto-sync: Record capture (or Clear) rewrites currentCombo, and
  // the ticks follow it.
  const syncedMods = useMemo(
    () => splitCombo(currentCombo).modifiers,
    [currentCombo],
  );
  useEffect(() => {
    setTicks(syncedMods);
  }, [syncedMods]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const el = e.target as Element | null;
      if (
        el &&
        typeof (el as Element).closest === "function" &&
        (el as Element).closest(".key-picker-pop, .key-picker-open-area")
      ) {
        return;
      }
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const { main } = splitCombo(currentCombo);

  function toggleTick(mod: string) {
    const next = ticks.includes(mod)
      ? ticks.filter((t) => t !== mod)
      : [...ticks, mod];
    setTicks(next);
    // Tick-only waits: write nothing until a main key exists. With a main
    // key, the tick updates the current value instantly.
    if (main) onSelect(buildCombo(next, main, preserveCase));
  }

  function chooseMain(name: string) {
    onSelect(buildCombo(ticks, name, preserveCase));
  }

  const q = query.trim();
  const results = searchKeys(q, excludeLeftMouse);
  const searching = q.length > 0;
  const list = page ? keysInCategory(page, excludeLeftMouse) : [];
  const pageTitle = page
    ? KEY_CATEGORIES.find((c) => c.id === page)?.title
    : null;

  return (
    <div className="key-picker-pop" role="listbox" aria-label="Pick a key">
      <div className="action-search-row">
        <span className="action-search-icon" aria-hidden="true">
          <Search />
        </span>
        <input
          className="action-search"
          value={query}
          placeholder="Search all keys..."
          aria-label="Search all keys"
          autoComplete="off"
          autoFocus
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {searching ? (
        results.length === 0 ? (
          <div className="action-empty">No keys found.</div>
        ) : (
          <div className="key-picker-keys">
            {results.map((k) => (
              <button
                key={k.name}
                type="button"
                className="key-picker-key"
                onClick={() => chooseMain(k.name)}
              >
                {k.name}
              </button>
            ))}
          </div>
        )
      ) : page === null ? (
        <div className="key-picker-cats">
          {KEY_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className="key-picker-cat"
              onClick={() => setPage(c.id)}
            >
              <span className="key-picker-cat-title">{c.title}</span>
              <span className="key-picker-cat-desc">{c.desc}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <button
            type="button"
            className="key-picker-back"
            onClick={() => setPage(null)}
          >
            <ArrowLeft aria-hidden="true" />
            <span>{pageTitle}</span>
          </button>
          <div className="key-picker-keys">
            {list.map((k) => (
              <button
                key={k.name}
                type="button"
                className="key-picker-key"
                onClick={() => chooseMain(k.name)}
              >
                {k.name}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="key-picker-ticks" aria-label="Modifiers">
        {MODIFIERS.map((m) => {
          const on = ticks.includes(m);
          return (
            <button
              key={m}
              type="button"
              role="checkbox"
              aria-checked={on}
              className={`key-picker-tick ${on ? "key-picker-tick-on" : ""}`}
              onClick={() => toggleTick(m)}
            >
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}
