import { useCallback, useState } from "react";
import { KeyRound } from "lucide-react";
import { useKeyCapture } from "../../hooks/useKeyCapture";
import { keyChipLabel, keyParts, keyVkSubtitle } from "../../lib/keymap";
import type { KeyBehavior, MacroAction } from "../../types";
import NumberStepper from "./NumberStepper";

type KeyAction = Extract<MacroAction, { type: "key" }>;

const BEHAVIORS: { value: KeyBehavior; label: string; desc: string }[] = [
  { value: "tap", label: "Tap", desc: "Standard press" },
  { value: "hold_down", label: "Hold Down", desc: "Stays pressed until released" },
  { value: "release", label: "Release", desc: "Releases a held key" },
];

export default function KeyActionEditor({
  action,
  onChange,
}: {
  action: KeyAction;
  onChange: (a: MacroAction) => void;
}) {
  const [picking, setPicking] = useState(false);
  const parts = keyParts(action.key);
  const current = BEHAVIORS.find((b) => b.value === action.behavior) ?? BEHAVIORS[0];
  const repeatEnabled = action.behavior === "tap";

  const pick = useCallback(
    (combo: string) => {
      onChange({ ...action, key: combo });
      setPicking(false);
    },
    [action, onChange],
  );
  const cancel = useCallback(() => setPicking(false), []);

  useKeyCapture(picking, pick, cancel, { preserveCase: true });

  function setBehavior(behavior: KeyBehavior) {
    onChange({
      ...action,
      behavior,
      repeat: behavior === "tap" ? action.repeat || 1 : 1,
    });
  }

  return (
    <div className="key-editor">
      <div className="key-target">
        <span className="key-target-icon" aria-hidden="true">
          <KeyRound />
        </span>
        <div className="key-target-text">
          <div className="key-target-chips">
            {parts.length === 0 ? (
              <span className="trigger-recording-hint">
                {picking ? "Press a key…" : "No key target"}
              </span>
            ) : (
              parts.map((p, i) => (
                <span key={`${p}-${i}`} className="kbd-row">
                  {i > 0 && <span className="kbd-plus">+</span>}
                  <kbd className="kbd kbd-last">{keyChipLabel(p)}</kbd>
                </span>
              ))
            )}
          </div>
          <span className="key-target-sub">{keyVkSubtitle(action.key)}</span>
        </div>
        <button
          type="button"
          className={`btn-record ${picking ? "btn-record-on" : ""}`}
          onClick={() => setPicking(true)}
        >
          {picking ? "Pick…" : "Pick Key"}
        </button>
      </div>

      <div className="behavior-head">
        <span className="behavior-label">Keystroke Behavior</span>
        <span className="behavior-desc">{current.desc}</span>
      </div>

      <div
        className="segmented"
        role="radiogroup"
        aria-label="Keystroke Behavior"
      >
        {BEHAVIORS.map((b) => (
          <button
            key={b.value}
            type="button"
            role="radio"
            aria-checked={action.behavior === b.value}
            className={`segment ${action.behavior === b.value ? "segment-on" : ""}`}
            onClick={() => setBehavior(b.value)}
          >
            {b.label}
          </button>
        ))}
      </div>

      <div className="stepper-row-pair">
        <NumberStepper
          label="Pre-delay"
          unit="ms"
          value={action.pre_delay_ms}
          max={60000}
          step={10}
          onChange={(pre_delay_ms) => onChange({ ...action, pre_delay_ms })}
        />
        <NumberStepper
          label="Repeat"
          unit="x"
          value={action.repeat}
          min={1}
          max={999}
          disabled={!repeatEnabled}
          onChange={(repeat) => onChange({ ...action, repeat })}
        />
      </div>
    </div>
  );
}
