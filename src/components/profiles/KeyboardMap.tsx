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
  onPick: (name: string) => void;
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
                      ? `${k.name} is assigned — click to use for selected trigger`
                      : `Assign ${k.name} to selected trigger`
                }
                onClick={() => {
                  if (k.name != null) onPick(k.name);
                }}
              >
                {k.label}
              </button>
            );
          })}
        </div>
      ))}
      <p className="keymap-hint">
        Click a key to assign it to the selected trigger. Highlighted keys are
        already in use.
      </p>
    </div>
  );
}
