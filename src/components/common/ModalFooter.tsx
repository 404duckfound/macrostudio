interface ModalFooterProps {
  saving: boolean;
  onCancel: () => void;
  submitLabel: string;
  danger?: boolean;
}

export default function ModalFooter({
  saving,
  onCancel,
  submitLabel,
  danger,
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
        <button
          className={danger ? "btn-danger" : "btn-primary"}
          type="submit"
          disabled={saving}
        >
          {submitLabel}
        </button>
      </span>
    </div>
  );
}
