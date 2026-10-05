import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppWindow } from "lucide-react";
import Modal from "../../common/Modal";
import ModalFooter from "../../common/ModalFooter";
import ProfileScopeField from "./fields/ProfileScopeField";
import type { Profile } from "../../../types";

type FormMode = "add" | "edit";

const FORM_COPY: Record<
  FormMode,
  { title: string; subtitle: string; pending: string; submit: string }
> = {
  add: {
    title: "New Profile",
    subtitle: "Configure workspace context & trigger scope",
    pending: "Creating...",
    submit: "+ Create Profile",
  },
  edit: {
    title: "Edit Profile",
    subtitle: "Update workspace context & trigger scope",
    pending: "Saving...",
    submit: "Save Changes",
  },
};

function buildExeOptions(
  visible: string[],
  activeWindow: string,
  targetExe: string,
): string[] {
  const out: string[] = [];
  for (const candidate of [...visible, activeWindow, targetExe]) {
    if (!candidate || candidate === "Unknown") continue;
    if (!out.some((x) => x.toLowerCase() === candidate.toLowerCase())) {
      out.push(candidate);
    }
  }
  return out;
}

interface ProfileFormModalProps {
  mode: FormMode;
  editing: Profile | null;
  profiles: Profile[];
  activeWindow: string;
  onClose: () => void;
  onSubmit: (profile: Profile, isNew: boolean) => Promise<void>;
}

export default function ProfileFormModal({
  mode,
  editing,
  profiles,
  activeWindow,
  onClose,
  onSubmit,
}: ProfileFormModalProps) {
  const [name, setName] = useState(editing?.name ?? "");
  const [targetExe, setTargetExe] = useState(editing?.target_exe ?? "");
  const [browsePath, setBrowsePath] = useState("");
  const [visibleExes, setVisibleExes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    invoke<string[]>("system_visible_window_exes")
      .then(setVisibleExes)
      .catch(() => setVisibleExes([]));
  }, []);

  const copy = FORM_COPY[mode];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Name is required.");
      return;
    }
    const cleanTarget = targetExe.trim() || null;
    // Auto-switch uses `profiles.find(...)`, so a second profile with the same
    // target would never activate. One app, one profile.
    const takenBy = cleanTarget
      ? profiles.find(
          (p) =>
            p.id !== editing?.id &&
            p.target_exe?.toLowerCase() === cleanTarget.toLowerCase(),
        )
      : undefined;
    if (takenBy) {
      setError(`"${takenBy.name}" is already linked to this application.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit(
        editing
          ? { ...editing, name: cleanName, target_exe: cleanTarget }
          : {
              id: crypto.randomUUID(),
              name: cleanName,
              triggers: [],
              target_exe: cleanTarget,
              enabled: true,
            },
        editing === null,
      );
    } catch (err) {
      setError(`Failed to save: ${err}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={copy.title}
      subtitle={copy.subtitle}
      icon={<AppWindow aria-hidden="true" />}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="modal-form modal-form-wide">
        <div className="modal-field">
          <div className="field-row">
            <label className="modal-label" htmlFor="profile-name">
              Profile Name <span className="modal-required">*</span>
            </label>
          </div>
          <input
            id="profile-name"
            className="modal-input"
            placeholder="e.g. DaVinci Production Suite"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            autoFocus
          />
        </div>
        <ProfileScopeField
          targetExe={targetExe}
          onTargetExe={setTargetExe}
          exeOptions={buildExeOptions(visibleExes, activeWindow, targetExe)}
          activeWindow={activeWindow}
          browsePath={browsePath}
          onBrowsePath={setBrowsePath}
        />
        {error && <span className="modal-error">{error}</span>}
        <ModalFooter
          saving={saving}
          onCancel={onClose}
          submitLabel={saving ? copy.pending : copy.submit}
        />
      </form>
    </Modal>
  );
}
