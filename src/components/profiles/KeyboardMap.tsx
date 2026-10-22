import type { CSSProperties } from "react";
import { KEYBOARD_ROWS, MOUSE_KEYS } from "../../lib/keyboardLayout";
import { splitCombo } from "../../lib/keyCatalog";
import { parseTrigger } from "../../lib/keys";
import type { Trigger } from "../../types";
import Chips from "./triggers/fields/Chips";

interface KeyboardMapProps {
  /** Uppercase main keys used by any draft trigger. */
  assigned: Set<string>;
  /** Uppercase main key of the selected trigger, if any. */
  selectedMain: string | null;
  disabled: boolean;
  /** Draft triggers, for the mouse-button mini list. */
  triggers: Trigger[];
  selectedIdx: number | null;
  /**
   * Receives the key name, where it was pressed, and the modifiers held
   * during the click: holding a modifier means the user wants a combination,
   * not the trigger that already owns the key.
   */
  onPick: (
    name: string,
    anchor: { top: number; right: number },
    modifiers: string[],
  ) => void;
  onSelectTrigger: (idx: number) => void;
}

/** The modifiers a click was made with, in the spellings the key picker uses. */
function heldModifiers(e: {
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}): string[] {
  const mods: string[] = [];
  if (e.ctrlKey) mods.push("Ctrl");
  if (e.shiftKey) mods.push("Shift");
  if (e.altKey) mods.push("Alt");
  if (e.metaKey) mods.push("Meta");
  return mods;
}

export default function KeyboardMap({
  assigned,
  selectedMain,
  disabled,
  triggers,
  selectedIdx,
  onPick,
  onSelectTrigger,
}: KeyboardMapProps) {
  const mouseTriggers = triggers
    .map((trigger, index) => ({ trigger, index }))
    .filter(({ trigger }) =>
      splitCombo(trigger.shortcut).main?.startsWith("Mouse"),
    );

  function pick(
    name: string,
    el: HTMLButtonElement,
    modifiers: string[] = [],
  ) {
    const r = el.getBoundingClientRect();
    onPick(name, { top: r.bottom + 4, right: r.right }, modifiers);
  }

  return (
    <div className="keymap-layout">
      <div className="keymap" role="group" aria-label="Keyboard map">
        {KEYBOARD_ROWS.map((row, ri) => (
          <div key={ri} className="keymap-row">
            {row.map((k) => {
              const isAssigned =
                k.name != null && assigned.has(k.name.toUpperCase());
              const isSelected =
                k.name != null &&
                selectedMain != null &&
                k.name.toUpperCase() === selectedMain;
              return (
                <button
                  key={k.label + ri}
                  type="button"
                  data-map-key={k.name ?? undefined}
                  style={{ "--w": k.w } as CSSProperties}
                  className={`keymap-key ${isAssigned ? "keymap-key-assigned" : ""} ${
                    isSelected ? "keymap-key-selected" : ""
                  } ${k.name == null ? "keymap-key-deco" : ""}`}
                  disabled={disabled || k.name == null}
                  title={
                    k.name == null
                      ? k.label
                      : isAssigned
                        ? `${k.name} is in use — click to edit that trigger`
                        : `Start a new trigger on ${k.name}`
                  }
                  onClick={(e) => {
                    if (k.name == null) return;
                    pick(k.name, e.currentTarget, heldModifiers(e));
                  }}
                >
                  {k.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <aside className="keymap-side" aria-label="Mouse buttons and mouse triggers">
        <div className="keymap-side-block">
          <span className="keymap-side-title">Mouse buttons</span>
          <div className="keymap-mouse-grid">
            {MOUSE_KEYS.map((k) => {
              const name = k.name as string;
              const isAssigned = assigned.has(name.toUpperCase());
              const isSelected = selectedMain === name.toUpperCase();
              return (
                <button
                  key={name}
                  type="button"
                  data-map-key={name}
                  disabled={disabled}
                  className={`keymap-key keymap-mouse-key ${
                    isAssigned ? "keymap-key-assigned" : ""
                  } ${isSelected ? "keymap-key-selected" : ""}`}
                  title={
                    isAssigned
                      ? `${name} is in use — click to edit that trigger`
                      : `Start a new trigger on ${name}`
                  }
                  onClick={(e) => pick(name, e.currentTarget, heldModifiers(e))}
                >
                  {k.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="keymap-side-block">
          <span className="keymap-side-title">Mouse triggers</span>
          {mouseTriggers.length === 0 ? (
            <p className="keymap-mini-empty">
              No mouse triggers yet. Click a mouse button to start one.
            </p>
          ) : (
            <div className="keymap-mini-list">
              {mouseTriggers.map(({ trigger, index }) => (
                <button
                  key={index}
                  type="button"
                  className={`keymap-mini-item ${
                    index === selectedIdx ? "keymap-mini-item-selected" : ""
                  }`}
                  title="Edit this trigger"
                  onClick={() => onSelectTrigger(index)}
                >
                  <Chips parts={parseTrigger(trigger.shortcut)} />
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
