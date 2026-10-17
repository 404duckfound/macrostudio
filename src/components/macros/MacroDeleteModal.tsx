import { Boxes } from "lucide-react";
import Modal from "../common/Modal";
import ModalFooter from "../common/ModalFooter";
import type { Macro } from "../../types";

interface MacroDeleteModalProps {
  macro: Macro;
  saving: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}

function blockCountLabel(n: number): string {
  return `${n} ${n === 1 ? "block" : "blocks"}`;
}

export default function MacroDeleteModal({
  macro,
  saving,
  error,
  onClose,
  onConfirm,
}: MacroDeleteModalProps) {
  return (
    <Modal
      title="Delete Macro"
      subtitle="This cannot be undone"
      icon={<Boxes aria-hidden="true" />}
      onClose={onClose}
    >
      <form
        className="modal-form modal-form-wide"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
      >
        <div className="scope-card scope-card-danger">
          <span className="scope-text">
            <span className="scope-title-row">
              <span className="scope-title">{macro.name || "(unnamed)"}</span>
              <span className="scope-badge">{blockCountLabel(macro.blocks.length)}</span>
            </span>
            <span className="scope-desc">
              {blockCountLabel(macro.blocks.length)}. Every trigger that runs this
              macro will lose its action. Delete this macro?
            </span>
          </span>
        </div>
        {error && <span className="modal-error">{error}</span>}
        <ModalFooter
          saving={saving}
          onCancel={onClose}
          submitLabel={saving ? "Deleting..." : "Delete Macro"}
          danger
        />
      </form>
    </Modal>
  );
}