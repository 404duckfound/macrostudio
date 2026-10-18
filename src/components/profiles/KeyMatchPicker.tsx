import { useEffect, useRef } from "react";
import { Plus } from "lucide-react";
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