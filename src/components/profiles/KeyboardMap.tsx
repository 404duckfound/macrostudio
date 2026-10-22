import type { CSSProperties } from "react";
import { Delete } from "lucide-react";
import { KEYBOARD_ROWS, MOUSE_KEYS } from "../../lib/keyboardLayout";
import type { Layer, Macro, Trigger } from "../../types";
import TriggerList from "./triggers/list/TriggerList";

interface KeyboardMapProps {
  /** Uppercase main keys used by any draft trigger. */
  assigned: Set<string>;
  /** Uppercase main key of the selected trigger, if any. */
  selectedMain: string | null;
  disabled: boolean;
  /** Draft triggers, also shown in the map's full trigger rail. */
  triggers: Trigger[];
  macros: Macro[];
  layers: Layer[];
  openMenuIdx: number | null;
  duplicateIndices: number[];
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
  onFocusAction: (idx: number) => void;
  onDuplicate: (idx: number) => void;
  onDelete: (idx: number) => void;
  onToggleMenu: (idx: number) => void;
  onAdd: () => void;
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

// The side column draws one mouse instead of five keycaps. Coordinates are in
// viewBox units of the drawing below; the names and labels stay in MOUSE_KEYS,
// which carries the combo spelling the generator matches.
const MOUSE_VIEW = { w: 132, h: 150 };

const MOUSE_BODY =
  "M66 8 C 41 8 26 20 21 40 C 18 54 16 74 16 92 L 16 110 " +
  "C 16 132 38 142 66 142 C 94 142 116 132 116 110 L 116 92 " +
  "C 116 74 114 54 111 40 C 106 20 91 8 66 8 Z";

interface MouseShape {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Text on the drawing; the accessible name comes from MOUSE_KEYS. */
  label: string;
  className: string;
}

const MOUSE_SHAPES: Record<string, MouseShape> = {
  MouseLeft: { x: 16, y: 8, w: 50, h: 64, label: "Left", className: "keymap-mouse-left" },
  MouseRight: { x: 66, y: 8, w: 50, h: 64, label: "Right", className: "keymap-mouse-right" },
  MouseMiddle: { x: 55, y: 30, w: 22, h: 38, label: "M", className: "keymap-mouse-wheel" },
  // The thumbs keep a hit box wider than the tab that is drawn: at the side
  // column's width a 14-unit tab is only ~17px wide, under the 24px minimum
  // for a pointer target, so the click area reaches into the body's edge.
  MouseX1: { x: 0, y: 74, w: 21, h: 22, label: "X1", className: "keymap-mouse-side" },
  MouseX2: { x: 0, y: 98, w: 21, h: 22, label: "X2", className: "keymap-mouse-side" },
};

function mousePartStyle(shape: MouseShape): CSSProperties {
  return {
    left: `${(shape.x / MOUSE_VIEW.w) * 100}%`,
    top: `${(shape.y / MOUSE_VIEW.h) * 100}%`,
    width: `${(shape.w / MOUSE_VIEW.w) * 100}%`,
    height: `${(shape.h / MOUSE_VIEW.h) * 100}%`,
  };
}

export default function KeyboardMap({
  assigned,
  selectedMain,
  disabled,
  triggers,
  selectedIdx,
  macros,
  layers,
  openMenuIdx,
  duplicateIndices,
  onPick,
  onSelectTrigger,
  onFocusAction,
  onDuplicate,
  onDelete,
  onToggleMenu,
  onAdd,
}: KeyboardMapProps) {
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
            {row.map((k, ki) => {
              if (k.label === "" && k.name === null) {
                return (
                  <span
                    key={`${ri}-${ki}`}
                    className="keymap-spacer"
                    style={{ gridColumn: `span ${k.w * 4}` } as CSSProperties}
                    aria-hidden="true"
                  />
                );
              }
              const isAssigned =
                k.name != null && assigned.has(k.name.toUpperCase());
              const isSelected =
                k.name != null &&
                selectedMain != null &&
                k.name.toUpperCase() === selectedMain;
              return (
                <button
                  // The row index alone is not unique: the shift row has two
                  // "Shift" keys, so both would claim the same React key.
                  // The column index makes the pair unique.
                  key={`${ri}-${ki}`}
                  type="button"
                  data-map-key={k.name ?? undefined}
                  aria-label={k.label || undefined}
                  style={{ gridColumn: `span ${k.w * 4}` } as CSSProperties}
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
                  {k.name === "Backspace" ? (
                    <Delete className="keymap-key-icon" aria-hidden="true" />
                  ) : (
                    k.label
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <section className="keymap-side keymap-mouse-block" aria-label="Mouse buttons">
          <span className="keymap-side-title">Mouse buttons</span>
          <div className="keymap-mouse" role="group" aria-label="Mouse buttons">
            <svg
              className="keymap-mouse-svg"
              viewBox={`0 0 ${MOUSE_VIEW.w} ${MOUSE_VIEW.h}`}
              aria-hidden="true"
              focusable="false"
            >
              <path className="keymap-mouse-body" d={MOUSE_BODY} />
              <path className="keymap-mouse-seam" d="M16 64 Q 66 72 116 64" />
              <path className="keymap-mouse-seam" d="M66 8 L66 30" />
              <rect className="keymap-mouse-tab" x="2" y="76" width="14" height="18" rx="5" />
              <rect className="keymap-mouse-tab" x="2" y="100" width="14" height="18" rx="5" />
              <rect
                className="keymap-mouse-wheel-shape"
                x="55"
                y="30"
                width="22"
                height="38"
                rx="11"
              />
            </svg>
            {MOUSE_KEYS.map((k) => {
              const shape = MOUSE_SHAPES[k.name];
              const isAssigned = assigned.has(k.name.toUpperCase());
              const isSelected = selectedMain === k.name.toUpperCase();
              return (
                <button
                  key={k.name}
                  type="button"
                  data-map-key={k.name}
                  style={mousePartStyle(shape)}
                  disabled={disabled}
                  aria-label={k.label}
                  className={`keymap-mouse-part ${shape.className} ${
                    isAssigned ? "keymap-mouse-part-assigned" : ""
                  } ${isSelected ? "keymap-mouse-part-selected" : ""}`}
                  data-tip={
                    isAssigned
                      ? `${k.name} is in use — click to edit that trigger`
                      : `Start a new trigger on ${k.name}`
                  }
                  onClick={(e) => pick(k.name, e.currentTarget, heldModifiers(e))}
                >
                  <span className="keymap-mouse-part-fill" aria-hidden="true" />
                  <span className="keymap-mouse-part-label">{shape.label}</span>
                </button>
              );
            })}
          </div>
      </section>

      <section className="keymap-side keymap-trigger-rail" aria-label="Triggers">
          <span className="keymap-side-title">Triggers</span>
          <TriggerList
            triggers={triggers}
            selectedIdx={selectedIdx}
            recording={disabled}
            macros={macros}
            layers={layers}
            openMenuIdx={openMenuIdx}
            duplicateIndices={duplicateIndices}
            onSelect={onSelectTrigger}
            onFocusAction={onFocusAction}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onToggleMenu={onToggleMenu}
            onAdd={onAdd}
          />
      </section>
    </div>
  );
}
