import { KEYBOARD_ROWS } from "../../lib/keyboardLayout";

export default function KeyboardMap({
  assigned,
  selectedMain,
  disabled,
  onPick,
}: {
  /** Uppercase main keys used by any draft trigger. */
  assigned: Set<string>;
  /** Uppercase main key of the selected trigger, if any. */
  selectedMain: string | null;
  disabled: boolean;
  /** Receives the key name and where it was pressed, to anchor a chooser. */
  onPick: (name: string, anchor: { top: number; right: number }) => void;
}) {
  return (
    <div className="keymap" role="group" aria-label="Keyboard map">
      {KEYBOARD_ROWS.map((row, ri) => (
        <div key={ri} className="keymap-row">
          {row.map((k) => {
            const isAssigned = k.name != null && assigned.has(k.name.toUpperCase());
            const isSelected =
              k.name != null &&
              selectedMain != null &&
              k.name.toUpperCase() === selectedMain;
            return (
              <button
                key={k.label + ri}
                type="button"
                style={{ flexGrow: k.w, flexBasis: 0 }}
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
                  const r = e.currentTarget.getBoundingClientRect();
                  onPick(k.name, { top: r.bottom + 4, right: r.right });
                }}
              >
                {k.label}
              </button>
            );
          })}
        </div>
      ))}
      <p className="keymap-hint">
        Click a key to jump to the trigger that uses it, or to start a new one
        on that key. Highlighted keys are already in use.
      </p>
    </div>
  );
}
