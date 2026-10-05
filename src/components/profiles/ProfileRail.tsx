import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Ellipsis, Plus } from "lucide-react";
import { useProfileStore } from "../../stores/useProfileStore";
import ProfileDeleteModal from "./modals/ProfileDeleteModal";
import ProfileFormModal from "./modals/ProfileFormModal";
import type { Profile, Trigger } from "../../types";

type ModalState =
  | { kind: "form"; mode: "add" }
  | { kind: "form"; mode: "edit"; profile: Profile }
  | { kind: "delete"; profile: Profile }
  | null;

async function refresh(): Promise<Profile[]> {
  const list = await invoke<Profile[]>("profile_list");
  useProfileStore.getState().setProfiles(list);
  return list;
}

function cloneTriggers(triggers: Trigger[]): Trigger[] {
  return triggers.map((t) => ({
    shortcut: t.shortcut,
    actions: t.actions.map((a) =>
      a.type === "custom"
        ? { type: "custom", blocks: a.blocks.map((b) => ({ ...b })) }
        : { ...a },
    ),
  }));
}

export default function ProfileRail({
  activeRun,
}: {
  activeRun: { id: string; ok: boolean } | null;
}) {
  const {
    profiles,
    activeId,
    defaultId,
    activeWindow,
    setActiveId,
    setPinnedId,
    setDefaultId,
  } = useProfileStore();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  function selectProfile(id: string | null) {
    setActiveId(id);
    setPinnedId(id);
  }
  const [modal, setModal] = useState<ModalState>(null);
  const [saving, setSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function closeModal() {
    setModal(null);
    setDeleteError("");
  }

  async function saveProfile(profile: Profile, isNew: boolean) {
    await invoke("profile_save", { profile });
    await refresh();
    if (isNew) selectProfile(profile.id);
    setModal(null);
  }

  async function deleteProfile() {
    if (modal?.kind !== "delete") return;
    setSaving(true);
    setDeleteError("");
    try {
      const deleted = modal.profile.id;
      await invoke("profile_delete", { profileId: deleted });
      const list = await refresh();
      const state = useProfileStore.getState();
      const firstId = list[0]?.id ?? null;
      if (state.activeId === deleted) {
        const nextActive =
          state.defaultId !== null && state.defaultId !== deleted
            ? state.defaultId
            : firstId;
        selectProfile(nextActive);
      }
      if (state.defaultId === deleted) state.setDefaultId(firstId);
      setModal(null);
    } catch (err) {
      setDeleteError(`Could not delete: ${err}`);
    } finally {
      setSaving(false);
    }
  }

  async function duplicateProfile(p: Profile) {
    const copy: Profile = {
      ...p,
      id: crypto.randomUUID(),
      name: `${p.name} (copy)`,
      triggers: cloneTriggers(p.triggers),
    };
    await invoke("profile_save", { profile: copy });
    await refresh();
    selectProfile(copy.id);
  }

  useEffect(() => {
    if (!openMenuId) return;
    function onDocClick() {
      setOpenMenuId(null);
    }
    function onDocKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuId(null);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [openMenuId]);

  return (
    <aside className="rail">
      <div className="rail-head">
        <span className="rail-title">Profiles</span>
        <button
          className="rail-add"
          type="button"
          aria-label="Add profile"
          title="Add profile"
          onClick={() => setModal({ kind: "form", mode: "add" })}
        >
          <Plus aria-hidden="true" />
        </button>
      </div>
      <div className="rail-list">
        {profiles.length === 0 ? (
          <div className="rail-empty">
            <p>No profiles found.</p>
            <button
              type="button"
              className="btn-secondary rail-empty-btn"
              onClick={() => setModal({ kind: "form", mode: "add" })}
            >
              <Plus aria-hidden="true" />
              <span>Create Profile</span>
            </button>
          </div>
        ) : (
          profiles.map((p) => (
            <div
              key={p.id}
              className={`rail-row ${activeId === p.id ? "active" : ""}`}
              onClick={() => {
                selectProfile(p.id);
                setOpenMenuId(null);
              }}
            >
              <div className="rail-row-main">
                <span className="rail-row-name">
                  {activeRun?.id === p.id && (
                    <span
                      className={`rail-run-dot ${
                        activeRun.ok ? "" : "rail-run-dot-error"
                      }`}
                      title={activeRun.ok ? "Engine Running" : "Engine Failed"}
                    />
                  )}
                  <span className="rail-name-text" title={p.name}>
                    {p.name}
                  </span>
                  {defaultId === p.id && (
                    <span className="rail-default-badge">Default</span>
                  )}
                </span>
                <span className="rail-row-meta">
                  {p.target_exe ? p.target_exe : "All windows"}
                </span>
              </div>
              <button
                className="rail-dots"
                type="button"
                aria-label={`${p.name} menu`}
                title="Options"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === p.id ? null : p.id);
                }}
              >
                <Ellipsis aria-hidden="true" />
              </button>
              {openMenuId === p.id && (
                <div
                  className="rail-menu"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId(null);
                  }}
                >
                  <button
                    className="rail-menu-item"
                    type="button"
                    onClick={() =>
                      setModal({ kind: "form", mode: "edit", profile: p })
                    }
                  >
                    Edit Profile
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
                    onClick={() => {
                      setDefaultId(p.id);
                      selectProfile(p.id);
                    }}
                  >
                    Make default
                  </button>
                  <div className="rail-menu-divider" />
                  <button
                    className="rail-menu-item rail-menu-item-danger"
                    type="button"
                    onClick={() => setModal({ kind: "delete", profile: p })}
                  >
                    Delete Profile
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {modal?.kind === "form" && (
        <ProfileFormModal
          mode={modal.mode}
          editing={modal.mode === "edit" ? modal.profile : null}
          profiles={profiles}
          activeWindow={activeWindow}
          onClose={closeModal}
          onSubmit={saveProfile}
        />
      )}

      {modal?.kind === "delete" && (
        <ProfileDeleteModal
          profile={modal.profile}
          saving={saving}
          error={deleteError}
          onClose={closeModal}
          onConfirm={deleteProfile}
        />
      )}
    </aside>
  );
}
