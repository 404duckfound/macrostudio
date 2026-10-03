import { AlertCircle } from "lucide-react";
import Chips from "./Chips";

export default function ShortcutField({
  parts,
  recording,
  onRecord,
  error,
}: {
  parts: string[];
  recording: boolean;
  onRecord: () => void;
  onClear: () => void;
  error?: string | null;
}) {
  return (
    <div className="shortcut-field-wrap">
      <div
        className={`shortcut-card ${recording ? "shortcut-card-recording" : ""} ${
          error ? "shortcut-card-error" : ""
        }`}
      >
        <div className="trigger-chips">
          {recording ? (
            <span className="trigger-recording-hint">
              Press a key or shortcut combo… (Esc to cancel)
            </span>
          ) : (
            <Chips parts={parts} />
          )}
        </div>
        <button
          type="button"
          className={`btn-record ${recording ? "btn-record-on" : ""}`}
          onClick={onRecord}
        >
          {recording ? "Listening…" : parts.length > 0 ? "Re-record" : "Record Key"}
        </button>
      </div>
      {error && (
        <div className="trigger-shortcut-error" role="alert">
          <AlertCircle className="error-icon" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
