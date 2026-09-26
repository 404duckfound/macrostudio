import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useProfileStore } from "../../stores/useProfileStore";
import Modal from "../common/Modal";
import type { Profile } from "../../types";
import { newId } from "../../utils/id";

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

export default function ProfileRail() {
  const { profiles, activeId, defaultId, setActiveId, setDefaultId } = useProfileStore();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // modal form state
  const [name, setName] = useState("");
  const [targetExe, setTargetExe] = useState("");
  const [exes, setExes] = useState<string[]>([]);
  const activeWindow = useProfileStore((s) => s.activeWindow);

  // calisan surecleri tara (modal acilmasa da bir kez yeterli)
  useEffect(() => {
    invoke<string[]>("system_running_exes")
      .then(setExes)
      .catch(() => setExes([]));
  }, []);

  // yakalanan aktif pencere listede yoksa seçeneğe ekle
  const exeOptions = [...exes];
  if (activeWindow && activeWindow !== "Unknown" && !exeOptions.some((e) => e.toLowerCase() === activeWindow.toLowerCase())) {
    exeOptions.push(activeWindow);
  }

  function openAdd() {
    setError("");
    setName("");
    setTargetExe("");
    setModal({ kind: "add" });
  }

  function openEdit(p: Profile) {
    setError("");
    setName(p.name);
    setTargetExe(p.target_exe ?? "");
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
          id: newId(),
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
      id: newId(),
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
          +
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
              ⋯
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
        <Modal title="New Profile" onClose={() => setModal(null)}>
          <form onSubmit={saveModal} className="modal-form">
            <input
              placeholder="Profile name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoFocus
            />
            <div className="exe-row">
              <select value={targetExe} onChange={(e) => setTargetExe(e.target.value)} aria-label="Target exe">
                <option value="">No target (all windows)</option>
                {exeOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
              <button
                className="btn-secondary exe-capture"
                type="button"
                title="Set active window as target"
                onClick={() => setTargetExe(activeWindow)}
                disabled={!activeWindow || activeWindow === "Unknown"}
              >
                Active window
              </button>
            </div>
            {error && <span className="modal-error">{error}</span>}
            <div className="modal-actions">
              <button className="btn-secondary" type="button" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? "Adding..." : "Add"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.kind === "edit" && (
        <Modal title="Edit Profile" onClose={() => setModal(null)}>
          <form onSubmit={saveModal} className="modal-form">
            <input
              placeholder="Profile name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoFocus
            />
            <div className="exe-row">
              <select value={targetExe} onChange={(e) => setTargetExe(e.target.value)} aria-label="Target exe">
                <option value="">No target (all windows)</option>
                {exeOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
              <button
                className="btn-secondary exe-capture"
                type="button"
                title="Set active window as target"
                onClick={() => setTargetExe(activeWindow)}
                disabled={!activeWindow || activeWindow === "Unknown"}
              >
                Active window
              </button>
            </div>
            {error && <span className="modal-error">{error}</span>}
            <div className="modal-actions">
              <button className="btn-secondary" type="button" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal?.kind === "delete" && (
        <Modal title="Delete Profile" onClose={() => setModal(null)}>
          <p className="modal-text">
            <strong>{modal.profile.name}</strong> — delete this profile? This cannot be undone.
          </p>
          {error && <span className="modal-error">{error}</span>}
          <div className="modal-actions">
            <button className="btn-secondary" type="button" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button className="btn-danger" type="button" disabled={saving} onClick={deleteModal}>
              {saving ? "Deleting..." : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </aside>
  );
}
