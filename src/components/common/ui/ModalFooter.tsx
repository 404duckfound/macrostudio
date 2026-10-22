import Spinner from "./Spinner";

interface ModalFooterProps {
  saving: boolean;
  onCancel: () => void;
  submitLabel: string;
  danger?: boolean;
  extraLabel?: string;
  onExtra?: () => void;
}

export default function ModalFooter({
  saving,
  onCancel,
  submitLabel,
  danger,
  extraLabel,
  onExtra,
}: ModalFooterProps) {
  return (
    <div className="modal-foot">
      <span className="modal-esc">
        <kbd>Esc</kbd> to cancel
      </span>
      <span className="modal-foot-actions">
        <button className="btn-ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
        {extraLabel && onExtra && (
          <button className="btn-ghost" type="button" onClick={onExtra} disabled={saving}>
            {extraLabel}
          </button>
        )}
        <button
          className={danger ? "btn-danger" : "btn-primary"}
          type="submit"
          disabled={saving}
        >
          {saving && <Spinner size={14} />}
          {submitLabel}
        </button>
      </span>
    </div>
  );
}
