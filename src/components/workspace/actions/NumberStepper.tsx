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
          onClick={() => onChange(Math.max(min, value - step))}
          aria-label={`Decrease ${label}`}
        >
          <Minus aria-hidden="true" />
        </button>
        <span className="stepper-value">{value}</span>
        <button
          type="button"
          className="stepper-btn"
          disabled={disabled || value >= max}
          onClick={() => onChange(Math.min(max, value + step))}
          aria-label={`Increase ${label}`}
        >
          <Plus aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
