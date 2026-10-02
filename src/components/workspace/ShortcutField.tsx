import Chips from "./Chips";

export default function ShortcutField({
  parts,
  recording,
  onRecord,
  onClear,
  error,
}: {
  parts: string[];
  recording: boolean;
  onRecord: () => void;
  onClear: () => void;
  error?: string | null;
}) {
  return (
    <div className="shortcut-card">
      <div className="trigger-chips">
        {recording ? (
          <span className="trigger-recording-hint">
            Press a key… (Esc to cancel)
          </span>
        ) : (
          <Chips parts={parts} />
        )}
      </div>
      <div className="field-row-actions">
        {parts.length > 0 && (
          <button type="button" className="link-btn" onClick={onClear}>
            Clear
          </button>
        )}
        <button
          type="button"
          className={`btn-record ${recording ? "btn-record-on" : ""}`}
          onClick={onRecord}
        >
          {recording ? "Recording…" : "Record Key"}
        </button>
      </div>
      {error && <span className="trigger-shortcut-error">{error}</span>}
    </div>
  );
}
