import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Ellipsis } from "lucide-react";
import { useProfileStore } from "../../stores/useProfileStore";
import Rail from "../common/Rail";
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
    block_key: t.block_key,
    actions: t.actions.map((a) => ({ ...a })),
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
    <>
      <Rail
        title="Profiles"
        addAriaLabel="Add profile"
        items={profiles}
        selectedId={activeId}
        emptyText="No profiles found."
        createLabel="Create Profile"
        onSelect={(id) => {
          selectProfile(id);
          setOpenMenuId(null);
        }}
        onAdd={() => setModal({ kind: "form", mode: "add" })}
        renderName={(p) => (
          <>
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
          </>
        )}
        renderMeta={(p) => (p.target_exe ? p.target_exe : "All windows")}
        renderActions={(p) => (
          <>
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
          </>
        )}
      />

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
    </>
  );
}
