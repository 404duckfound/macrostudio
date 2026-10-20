import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { MODIFIERS, buildCombo } from "../../lib/keyCatalog";
import type { Trigger } from "../../types";

interface KeyMatchPickerProps {
  /** Triggers whose main key matched, in list order. */
  matches: { trigger: Trigger; index: number }[];
  /** Main key the user pressed, e.g. "P". */
  mainKey: string;
  /** Shortcut the create row writes; a physical press keeps its modifiers. */
  createCombo: string;
  /** Viewport coords of the pressed key, for fixed positioning. */
  anchor: { top: number; right: number };
  onPick: (index: number) => void;
  onCreate: () => void;
  onClose: () => void;
}

/**
 * Opened when several triggers share one main key (Ctrl+P and Shift+P both
 * land on P). Fixed-position and anchored to the key, because the map itself
 * is a scroll container that would clip an absolutely positioned child.
 */
export default function KeyMatchPicker({
  matches,
  mainKey,
  createCombo,
  anchor,
  onPick,
  onCreate,
  onClose,
}: KeyMatchPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onDocKey);
    return () => document.removeEventListener("keydown", onDocKey);
  }, [onClose]);

  return (
    <div
      className="rail-menu key-match-picker"
      ref={ref}
      role="listbox"
      aria-label={`Triggers on ${mainKey}`}
      style={{ top: anchor.top, left: anchor.right }}
      onClick={(e) => e.stopPropagation()}
    >
      {matches.map(({ trigger, index }) => (
        <button
          key={index}
          type="button"
          role="option"
          aria-selected={false}
          className="rail-menu-item"
          onClick={() => onPick(index)}
        >
          {trigger.shortcut || mainKey}
        </button>
      ))}
      <div className="rail-menu-divider" />
      <button
        type="button"
        className="rail-menu-item"
        onClick={onCreate}
      >
        <Plus className="rail-menu-icon" aria-hidden="true" />
        Create new trigger on {createCombo}
      </button>
    </div>
  );
}

interface KeyModifierPickerProps {
  /** Main key clicked on the map. */
  mainKey: string;
  anchor: { top: number; right: number };
  /**
   * Creates the trigger for the chosen combo. Returns an error message when
   * another card already owns it, or null on success (the parent closes us).
   */
  onCreate: (combo: string) => string | null;
  onClose: () => void;
}

/**
 * Modifier chooser for a map click. A physical press already carries its
 * modifiers in the combo, so this is only for the pointer path: click P, tick
 * Ctrl, get Ctrl+P. The clash rule is the same one Record and the manual Key
 * Picker use, and it stays inside this panel so the picker cannot quietly
 * create a duplicate.
 */
export function KeyModifierPicker({
  mainKey,
  anchor,
  onCreate,
  onClose,
}: KeyModifierPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ticks, setTicks] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const combo = buildCombo(ticks, mainKey, false);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) onClose();
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
  }, [onClose]);

  // The map lives at the right and bottom edges too; keep the panel on screen.
  const left = Math.min(anchor.right, window.innerWidth - 240);
  const top = Math.min(anchor.top, window.innerHeight - 220);

  function toggle(mod: string) {
    setError(null);
    setTicks((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod],
    );
  }

  function create() {
    const message = onCreate(combo);
    if (message) setError(message);
  }

  return (
    <div
      className="rail-menu key-match-picker key-modifier-picker"
      ref={ref}
      role="dialog"
      aria-label={`Choose modifiers for ${mainKey}`}
      style={{ top, left }}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="key-modifier-title">
        New trigger on <span className="key-modifier-main">{mainKey}</span>
      </span>
      <div className="key-modifier-ticks">
        {MODIFIERS.map((mod) => {
          const on = ticks.includes(mod);
          return (
            <button
              key={mod}
              type="button"
              role="checkbox"
              aria-checked={on}
              className={`key-picker-tick ${on ? "key-picker-tick-on" : ""}`}
              onClick={() => toggle(mod)}
            >
              {mod}
            </button>
          );
        })}
      </div>
      {error && (
        <div className="key-modifier-error" role="alert">
          {error}
        </div>
      )}
      <div className="rail-menu-divider" />
      <button type="button" className="rail-menu-item" onClick={create}>
        <Plus className="rail-menu-icon" aria-hidden="true" />
        Create {combo}
      </button>
      <button type="button" className="rail-menu-item" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}
