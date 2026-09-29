import { AppWindow } from "lucide-react";
import Modal from "../common/Modal";
import ModalFooter from "../common/ModalFooter";
import type { Profile } from "../../types";

interface DeleteProfileModalProps {
  profile: Profile;
  saving: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ProfileDeleteModal({
  profile,
  saving,
  error,
  onClose,
  onConfirm,
}: DeleteProfileModalProps) {
  const linked = profile.target_exe;
  return (
    <Modal
      title="Delete Profile"
      subtitle="This cannot be undone"
      icon={<AppWindow aria-hidden="true" />}
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
              <span className="scope-title">{profile.name}</span>
              {linked ? (
                <span className="scope-badge scope-badge-linked">Linked</span>
              ) : (
                <span className="scope-badge">Global</span>
              )}
            </span>
            <span className="scope-desc">
              {linked ? `Linked to ${linked}.` : "Global profile."} Triggers in
              this profile will stop working. Delete this profile?
            </span>
          </span>
        </div>
        {error && <span className="modal-error">{error}</span>}
        <ModalFooter
          saving={saving}
          onCancel={onClose}
          submitLabel={saving ? "Deleting..." : "Delete Profile"}
          danger
        />
      </form>
    </Modal>
  );
}
