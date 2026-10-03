import { Ban, Eye } from "lucide-react";

export default function BlockKeyToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="block-card">
      <div className="block-card-info">
        <div className="block-card-title-row">
          <span className="toggle-title">Block Original Keypress</span>
          <span className={`toggle-state-badge ${value ? "badge-blocked" : "badge-pass"}`}>
            {value ? (
              <>
                <Ban className="badge-icon" aria-hidden="true" /> Blocked
              </>
            ) : (
              <>
                <Eye className="badge-icon" aria-hidden="true" /> Pass (~)
              </>
            )}
          </span>
        </div>
        <span className="toggle-sub">
          {value
            ? "Suppresses the native physical key event"
            : "Allows physical key event to pass through (~)"}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-label="Block Original Keypress"
        aria-checked={value}
        className={`switch ${value ? "switch-on" : ""}`}
        onClick={() => onChange(!value)}
      >
        <span className="switch-thumb" />
      </button>
    </div>
  );
}
