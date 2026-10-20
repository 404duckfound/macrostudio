import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppWindow, Layers, X } from "lucide-react";
import Modal from "../../common/ui/Modal";
import ModalFooter from "../../common/ui/ModalFooter";
import ProfileScopeField from "../ProfileScopeField";
import KeyPicker from "../triggers/fields/KeyPicker";
import { splitCombo } from "../../../lib/keyCatalog";
import type { Layer, Profile } from "../../../types";

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
  // Modifier layers: while the activator key is held, the layer's triggers
  // take over from the normal ones.
  const [layers, setLayers] = useState<Layer[]>(editing?.layers ?? []);
  const [layerName, setLayerName] = useState("");
  const [layerActivator, setLayerActivator] = useState("");
  const [activatorPickerOpen, setActivatorPickerOpen] = useState(false);
  const [activatorError, setActivatorError] = useState("");

  useEffect(() => {
    invoke<string[]>("system_visible_window_exes")
      .then(setVisibleExes)
      .catch(() => setVisibleExes([]));
  }, []);

  const copy = FORM_COPY[mode];

  // An activator is a single key: AHK reads one key's physical state, so a
  // combination cannot be held as the layer switch.
  function pickActivator(combo: string) {
    const { modifiers, main } = splitCombo(combo);
    if (modifiers.length === 0 && main) return main;
    if (modifiers.length === 1 && !main) return modifiers[0];
    return null;
  }

  function addLayer() {
    const cleanName = layerName.trim();
    if (!cleanName || !layerActivator) return;
    setLayers((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: cleanName, activator: layerActivator },
    ]);
    setLayerName("");
    setLayerActivator("");
    setActivatorError("");
  }

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
          ? { ...editing, name: cleanName, target_exe: cleanTarget, layers }
          : {
              id: crypto.randomUUID(),
              name: cleanName,
              triggers: [],
              target_exe: cleanTarget,
              layers,
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
            autoComplete="off"
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
        <div className="modal-field">
          <div className="field-row">
            <label className="modal-label">Layers</label>
          </div>
          <p className="modal-hint">
            A layer takes over while its key is held: the triggers you put in
            it replace the normal ones for the same key.
          </p>
          {layers.map((layer) => (
            <div key={layer.id} className="layer-row">
              <Layers className="layer-row-icon" aria-hidden="true" />
              <span className="layer-row-name">{layer.name}</span>
              <kbd className="kbd">{layer.activator}</kbd>
              <button
                type="button"
                className="layer-row-remove"
                aria-label={`Remove layer ${layer.name}`}
                onClick={() =>
                  setLayers((prev) => prev.filter((l) => l.id !== layer.id))
                }
              >
                <X aria-hidden="true" />
              </button>
            </div>
          ))}
          <div className="layer-add">
            <input
              className="modal-input"
              placeholder="Layer name"
              aria-label="Layer name"
              value={layerName}
              maxLength={40}
              autoComplete="off"
              onChange={(e) => setLayerName(e.target.value)}
            />
            <button
              type="button"
              className="layer-activator-btn"
              onClick={() => {
                setActivatorPickerOpen((v) => !v);
                setActivatorError("");
              }}
            >
              {layerActivator || "Choose key…"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={!layerName.trim() || !layerActivator}
              onClick={addLayer}
            >
              Add
            </button>
          </div>
          {activatorError && <span className="modal-error">{activatorError}</span>}
          {activatorPickerOpen && (
            <div className="key-picker-wrap">
              <KeyPicker
                open
                currentCombo={layerActivator}
                preserveCase
                excludeLeftMouse={false}
                onSelect={(combo) => {
                  const key = pickActivator(combo);
                  if (!key) {
                    setActivatorError("Pick a single key to hold down.");
                    return;
                  }
                  setLayerActivator(key);
                  setActivatorPickerOpen(false);
                  setActivatorError("");
                }}
                onClose={() => setActivatorPickerOpen(false)}
              />
            </div>
          )}
        </div>
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
