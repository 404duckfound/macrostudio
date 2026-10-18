import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

export default function NumberStepper({
  label,
  unit,
  value,
  min = 0,
  max = 999,
  step = 1,
  disabled = false,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit(val: number) {
    const clamped = Math.max(min, Math.min(max, isNaN(val) ? min : val));
    setText(String(clamped));
    onChange(clamped);
  }

  return (
    <div className={`stepper ${disabled ? "stepper-disabled" : ""}`}>
      <div className="stepper-head">
        <span className="stepper-label">{label}</span>
        <span className="stepper-unit">{unit}</span>
      </div>
      <div className="stepper-row">
        <button
          type="button"
          className="stepper-btn"
          disabled={disabled || value <= min}
          onClick={() => commit(value - step)}
          aria-label={`Decrease ${label}`}
        >
          <Minus aria-hidden="true" />
        </button>
        <input
          type="number"
          className="stepper-input"
          value={text}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-label={label}
          autoComplete="off"
          onChange={(e) => {
            setText(e.target.value);
            const num = Number(e.target.value);
            if (!isNaN(num)) {
              onChange(Math.max(min, Math.min(max, num)));
            }
          }}
          onBlur={() => commit(Number(text))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit(Number(text));
              e.currentTarget.blur();
            }
          }}
        />
        <button
          type="button"
          className="stepper-btn"
          disabled={disabled || value >= max}
          onClick={() => commit(value + step)}
          aria-label={`Increase ${label}`}
        >
          <Plus aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
