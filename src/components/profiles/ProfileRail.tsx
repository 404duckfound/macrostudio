import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { AppWindow, Crosshair, Ellipsis, FolderOpen, Plus } from "lucide-react";
import { useProfileStore } from "../../stores/useProfileStore";
import Modal from "../common/Modal";
import type { Profile } from "../../types";

type ModalState =
  | { kind: "add" }
  | { kind: "edit"; profile: Profile }
  | { kind: "delete"; profile: Profile }
  | null;

async function refresh() {
  const list = await invoke<Profile[]>("profile_list");
  useProfileStore.getState().setProfiles(list);
  return list;
}

function ProfileIcon() {
  return <AppWindow aria-hidden="true" />;
}

function basename(path: string): string {
  const clean = path.replace(/\//g, "\\");
  return clean.split("\\").pop() ?? path;
}

function ProfileFields({
  name,
  setName,
  targetExe,
  setTargetExe,
  exeOptions,
  activeWindow,
  browsePath,
  setBrowsePath,
}: {
  name: string;
  setName: (v: string) => void;
  targetExe: string;
  setTargetExe: (v: string) => void;
  exeOptions: string[];
  activeWindow: string;
  browsePath: string;
  setBrowsePath: (v: string) => void;
}) {
  const hasActive = activeWindow !== "" && activeWindow !== "Unknown";
  const specific = targetExe !== "";

  async function browseExe() {
    try {
      const picked = await open({
        multiple: false,
        filters: [{ name: "Executable", extensions: ["exe"] }],
      });
      if (typeof picked === "string" && picked) {
        setBrowsePath(picked);
        setTargetExe(basename(picked));
      }
    } catch {
      // dialog kapandiysa sessiz gec
    }
  }

  return (
    <>
      <div className="modal-field">
        <div className="field-row">
          <label className="modal-label" htmlFor="profile-name">
            Profile Name <span className="modal-required">*</span>
          </label>
          <span className="modal-side">Identifier</span>
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
      <div className="modal-field">
        <span className="modal-label">Which window should this profile apply to?</span>
        <button
          type="button"
          className={`scope-card ${!specific ? "scope-card-active" : ""}`}
          onClick={() => {
            setTargetExe("");
            setBrowsePath("");
          }}
        >
          <span className={`scope-radio ${!specific ? "scope-radio-on" : ""}`} aria-hidden="true" />
          <span className="scope-text">
            <span className="scope-title-row">
              <span className="scope-title">All windows</span>
              <span className="scope-badge">Global</span>
            </span>
            <span className="scope-desc">Available across all active applications without filter.</span>
          </span>
        </button>
        <button
          type="button"
          className={`scope-card ${specific ? "scope-card-active" : ""}`}
          onClick={() => {
            if (!specific) setTargetExe(hasActive ? activeWindow : (exeOptions[0] ?? ""));
          }}
        >
          <span className={`scope-radio ${specific ? "scope-radio-on" : ""}`} aria-hidden="true" />
          <span className="scope-text">
            <span className="scope-title-row">
              <span className="scope-title">Only a specific application</span>
              {specific && <span className="scope-badge scope-badge-linked">Linked</span>}
            </span>
            <span className="scope-desc">Activates automatically when the selected process is active.</span>
          </span>
        </button>
        {specific && (
          <div className="scope-card scope-card-active scope-detail">
            <div className="exe-row">
              <select
                value={targetExe}
                onChange={(e) => {
                  setTargetExe(e.target.value);
                  setBrowsePath("");
                }}
                aria-label="Target application"
              >
                {exeOptions.length === 0 && <option value="">No open windows found</option>}
                {exeOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
              <button
                className="btn-secondary exe-btn"
                type="button"
                title="Set active window as target"
                onClick={() => {
                  if (hasActive) {
                    setTargetExe(activeWindow);
                    setBrowsePath("");
                  }
                }}
                disabled={!hasActive}
              >
                <Crosshair className="exe-btn-icon" aria-hidden="true" /> Detect
              </button>
              <button className="btn-secondary exe-btn" type="button" title="Browse for executable" onClick={browseExe}>
                <FolderOpen className="exe-btn-icon" aria-hidden="true" /> Browse
              </button>
            </div>
            <div className="exe-path" title={browsePath || targetExe}>
              {browsePath || targetExe}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function ModalFooter({
  saving,
  onCancel,
  submitLabel,
  danger,
}: {
  saving: boolean;
  onCancel: () => void;
  submitLabel: string;
  danger?: boolean;
}) {
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

export default function ProfileRail() {
  const { profiles, activeId, defaultId, setActiveId, setDefaultId } = useProfileStore();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // modal form state
  const [name, setName] = useState("");
  const [targetExe, setTargetExe] = useState("");
  const [browsePath, setBrowsePath] = useState("");
  const [exes, setExes] = useState<string[]>([]);
  const activeWindow = useProfileStore((s) => s.activeWindow);

  // modal her acildiginda gorunur pencereleri tazele
  useEffect(() => {
    if (!modal) return;
    invoke<string[]>("system_visible_window_exes")
      .then(setExes)
      .catch(() => setExes([]));
  }, [modal]);

  // yakalanan aktif pencere ya da kayitli hedef listede yoksa secenege ekle
  const exeOptions = [...exes];
  for (const extra of [activeWindow, targetExe]) {
    if (extra && extra !== "Unknown" && !exeOptions.some((e) => e.toLowerCase() === extra.toLowerCase())) {
      exeOptions.push(extra);
    }
  }

  function openAdd() {
    setError("");
    setName("");
    setTargetExe("");
    setBrowsePath("");
    setModal({ kind: "add" });
  }

  function openEdit(p: Profile) {
    setError("");
    setName(p.name);
    setTargetExe(p.target_exe ?? "");
    setBrowsePath("");
    setModal({ kind: "edit", profile: p });
  }

  async function saveModal(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanTarget = targetExe.trim();
    if (!cleanName) {
      setError("Name is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (modal?.kind === "edit") {
        const profile: Profile = {
          ...modal.profile,
          name: cleanName,
          target_exe: cleanTarget || null,
        };
        await invoke("profile_save", { profile });
        await refresh();
        setModal(null);
      } else {
        const profile: Profile = {
          id: crypto.randomUUID(),
          name: cleanName,
          triggers: [],
          target_exe: cleanTarget || null,
          enabled: true,
          block_key: true,
        };
        await invoke("profile_save", { profile });
        await refresh();
        setActiveId(profile.id);
        setModal(null);
      }
    } catch (err) {
      setError(`Failed to save: ${err}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteModal() {
    if (modal?.kind !== "delete") return;
    setSaving(true);
    setError("");
    try {
      await invoke("profile_delete", { profileId: modal.profile.id });
      const list = await refresh();
      const state = useProfileStore.getState();
      const deleted = modal.profile.id;
      if (state.activeId === deleted) {
        const fallback =
          (state.defaultId && state.defaultId !== deleted && list.find((p) => p.id === state.defaultId)) ||
          list[0];
        state.setActiveId(fallback ? fallback.id : null);
      }
      if (state.defaultId === deleted) state.setDefaultId(list[0]?.id ?? null);
      setModal(null);
    } catch (err) {
      setError(`Could not delete: ${err}`);
    } finally {
      setSaving(false);
    }
  }

  function makeDefault(id: string) {
    setDefaultId(id);
    setActiveId(id);
    setOpenMenuId(null);
  }

  async function duplicateProfile(p: Profile) {
    const copy: Profile = {
      ...p,
      id: crypto.randomUUID(),
      name: `${p.name} (copy)`,
      triggers: p.triggers.map((t) => ({
        shortcut: t.shortcut,
        actions: t.actions.map((a) =>
          a.type === "custom"
            ? { type: "custom", blocks: a.blocks.map((b) => ({ ...b })) }
            : { ...a },
        ),
      })),
    };
    await invoke("profile_save", { profile: copy });
    await refresh();
    setActiveId(copy.id);
    setOpenMenuId(null);
  }

  return (
    <aside className="rail">
      <div className="rail-head">
        <span className="rail-title">Profiles</span>
        <button className="rail-add" type="button" aria-label="Add profile" title="Add profile" onClick={openAdd}>
          <Plus aria-hidden="true" />
        </button>
      </div>
      <div className="rail-list">
        {profiles.map((p) => (
          <div
            key={p.id}
            className={`rail-row ${activeId === p.id ? "active" : ""}`}
            onClick={() => {
              setActiveId(p.id);
              setOpenMenuId(null);
            }}
          >
            <span className="rail-row-name">
              {p.name}
              {defaultId === p.id && <span className="rail-default-badge">Default</span>}
            </span>
            <button
              className="rail-dots"
              type="button"
              aria-label={`${p.name} menu`}
              title="Menu"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(openMenuId === p.id ? null : p.id);
              }}
            >
              <Ellipsis aria-hidden="true" />
            </button>
            {openMenuId === p.id && (
              <div className="rail-menu" onClick={(e) => e.stopPropagation()}>
                <button
                  className="rail-menu-item"
                  type="button"
                  onClick={() => {
                    setOpenMenuId(null);
                    openEdit(p);
                  }}
                >
                  Edit
                </button>
                <button
                  className="rail-menu-item"
                  type="button"
                  onClick={() => {
                    setOpenMenuId(null);
                    setModal({ kind: "delete", profile: p });
                  }}
                >
                  Delete
                </button>
                <button
                  className="rail-menu-item"
                  type="button"
                  onClick={() => duplicateProfile(p)}
                >
                  Duplicate
                </button>
                <button
                  className="rail-menu-item"
                  type="button"
                  disabled={defaultId === p.id}
                  onClick={() => makeDefault(p.id)}
                >
                  Make default
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {modal?.kind === "add" && (
        <Modal
          title="New Profile"
          subtitle="Configure workspace context & trigger scope"
          icon={<ProfileIcon />}
          onClose={() => setModal(null)}
        >
          <form onSubmit={saveModal} className="modal-form modal-form-wide">
            <ProfileFields
              name={name}
              setName={setName}
              targetExe={targetExe}
              setTargetExe={setTargetExe}
              exeOptions={exeOptions}
              activeWindow={activeWindow}
              browsePath={browsePath}
              setBrowsePath={setBrowsePath}
            />
            {error && <span className="modal-error">{error}</span>}
            <ModalFooter
              saving={saving}
              onCancel={() => setModal(null)}
              submitLabel={saving ? "Creating..." : "+ Create Profile"}
            />
          </form>
        </Modal>
      )}

      {modal?.kind === "edit" && (
        <Modal
          title="Edit Profile"
          subtitle="Update workspace context & trigger scope"
          icon={<ProfileIcon />}
          onClose={() => setModal(null)}
        >
          <form onSubmit={saveModal} className="modal-form modal-form-wide">
            <ProfileFields
              name={name}
              setName={setName}
              targetExe={targetExe}
              setTargetExe={setTargetExe}
              exeOptions={exeOptions}
              activeWindow={activeWindow}
              browsePath={browsePath}
              setBrowsePath={setBrowsePath}
            />
            {error && <span className="modal-error">{error}</span>}
            <ModalFooter
              saving={saving}
              onCancel={() => setModal(null)}
              submitLabel={saving ? "Saving..." : "Save Changes"}
            />
          </form>
        </Modal>
      )}

      {modal?.kind === "delete" && (
        <Modal
          title="Delete Profile"
          subtitle="This cannot be undone"
          icon={<ProfileIcon />}
          onClose={() => setModal(null)}
        >
          <form
            className="modal-form modal-form-wide"
            onSubmit={(e) => {
              e.preventDefault();
              deleteModal();
            }}
          >
            <div className="scope-card scope-card-danger">
              <span className="scope-text">
                <span className="scope-title-row">
                  <span className="scope-title">{modal.profile.name}</span>
                  {modal.profile.target_exe ? (
                    <span className="scope-badge scope-badge-linked">Linked</span>
                  ) : (
                    <span className="scope-badge">Global</span>
                  )}
                </span>
                <span className="scope-desc">
                  {modal.profile.target_exe
                    ? `Linked to ${modal.profile.target_exe}. Triggers in this profile will stop working.`
                    : "Global profile. Triggers in this profile will stop working."}{" "}
                  Delete this profile?
                </span>
              </span>
            </div>
            {error && <span className="modal-error">{error}</span>}
            <ModalFooter
              saving={saving}
              onCancel={() => setModal(null)}
              submitLabel={saving ? "Deleting..." : "Delete Profile"}
              danger
            />
          </form>
        </Modal>
      )}
    </aside>
  );
}
