import { AlertCircle } from "lucide-react";
import Chips from "./Chips";
import KeyPicker from "./KeyPicker";

export default function ShortcutField({
  parts,
  combo,
  recording,
  pickerOpen,
  onRecord,
  onPickerOpen,
  onPickerSelect,
  onPickerClose,
  error,
}: {
  parts: string[];
  combo: string;
  recording: boolean;
  pickerOpen: boolean;
  onRecord: () => void;
  onPickerOpen: () => void;
  onPickerSelect: (combo: string) => void;
  onPickerClose: () => void;
  error?: string | null;
}) {
  const pickerVisible = pickerOpen && !recording;
  return (
    <div className="shortcut-field-wrap">
      <div className="key-picker-wrap">
        <div
          className={`shortcut-card ${recording ? "shortcut-card-recording" : ""} ${
            error ? "shortcut-card-error" : ""
          }`}
        >
          <div
            className="trigger-chips key-picker-open-area"
            role="button"
            tabIndex={recording ? -1 : 0}
            title="Click to pick a key manually"
            onClick={() => {
              if (!recording) onPickerOpen();
            }}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !recording) {
                e.preventDefault();
                onPickerOpen();
              }
            }}
          >
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
        <KeyPicker
          open={pickerVisible}
          currentCombo={combo}
          preserveCase={false}
          excludeLeftMouse
          onSelect={onPickerSelect}
          onClose={onPickerClose}
        />
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
