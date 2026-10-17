import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { useProfileStore } from "../../stores/useProfileStore";
import Modal from "./Modal";
import ModalFooter from "./ModalFooter";

interface SwitchGuardProps {
  dirty: boolean;
  saving: boolean;
  /** Persists the draft, then completes the queued switch. */
  onSaveAndSwitch: () => Promise<void> | void;
  /** Drops the draft, then completes the queued switch. */
  onDiscardAndSwitch: () => void;
}

export default function SwitchGuard({
  dirty,
  saving,
  onSaveAndSwitch,
  onDiscardAndSwitch,
}: SwitchGuardProps) {
  const pendingSwitch = useProfileStore((s) => s.pendingSwitch);
  const applySwitch = useProfileStore((s) => s.applySwitch);
  const clearPendingSwitch = useProfileStore((s) => s.clearPendingSwitch);
  const askedRef = useRef<string | null>(null);

  // A clean workspace applies the queued switch right away; a dirty one waits
  // for an explicit answer in the modal below.
  useEffect(() => {
    if (!pendingSwitch) {
      askedRef.current = null;
      return;
    }
    if (!dirty) {
      applySwitch(pendingSwitch.id, pendingSwitch.source);
      return;
    }
    if (askedRef.current === pendingSwitch.id) return;
    askedRef.current = pendingSwitch.id;
  }, [pendingSwitch, dirty, applySwitch]);

  // Leaving the profiles view with an unanswered request: apply it, otherwise
  // the queued switch would never land and the profile would stay stuck.
  useEffect(() => {
    return () => {
      const pending = useProfileStore.getState().pendingSwitch;
      if (pending) useProfileStore.getState().applySwitch(pending.id, pending.source);
    };
  }, []);

  if (!pendingSwitch) return null;

  return (
    <Modal
      title="Unsaved changes"
      subtitle="This profile has trigger edits that are not saved yet"
      icon={<AlertTriangle aria-hidden="true" />}
      onClose={clearPendingSwitch}
    >
      <form
        className="modal-form modal-form-wide"
        onSubmit={(e) => {
          e.preventDefault();
          void onSaveAndSwitch();
        }}
      >
        <div className="scope-card">
          <span className="scope-text">
            <span className="scope-desc">
              Save the current profile before switching, or discard the changes.
              Nothing is written either way until you choose.
            </span>
          </span>
        </div>
        <ModalFooter
          saving={saving}
          onCancel={clearPendingSwitch}
          submitLabel={saving ? "Saving..." : "Save and switch"}
          extraLabel="Discard changes"
          onExtra={onDiscardAndSwitch}
        />
      </form>
    </Modal>
  );
}