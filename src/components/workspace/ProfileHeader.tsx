import { useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus } from "lucide-react";
import { useProfileStore } from "../../stores/useProfileStore";
import SelectMenu from "../common/SelectMenu";
import ProfileDeleteModal from "../profiles/modals/ProfileDeleteModal";
import ProfileFormModal from "../profiles/modals/ProfileFormModal";
import type { Profile, Trigger } from "../../types";

type ModalState =
  | { kind: "form"; mode: "add" }
  | { kind: "form"; mode: "edit"; profile: Profile }
  | { kind: "delete"; profile: Profile }
  | null;

interface ProfileHeaderProps {
  activeRun: { id: string; ok: boolean } | null;
  withoutActionCount: number;
  dirty: boolean;
  onRequestSwitch: (id: string) => void;
  /** Right-aligned slot for the canvas view switcher. */
  tabs?: ReactNode;
}

async function refresh(): Promise<Profile[]> {
  const list = await invoke<Profile[]>("profile_list");
  useProfileStore.getState().setProfiles(list);
  return list;
}

function cloneTriggers(triggers: Trigger[]): Trigger[] {
  return triggers.map((t) => ({
    shortcut: t.shortcut,
    block_key: t.block_key,
    fire_on_release: t.fire_on_release,
    mod_sides: { ...t.mod_sides },
    wildcard: t.wildcard,
    force_hook: t.force_hook,
    enabled: t.enabled ?? true,
    actions: t.actions.map((a) => ({ ...a })),
  }));
}

export default function ProfileHeader({
  activeRun,
  withoutActionCount,
  dirty,
  onRequestSwitch,
  tabs,
}: ProfileHeaderProps) {
  const profiles = useProfileStore((s) => s.profiles);
  const activeId = useProfileStore((s) => s.activeId);
  const defaultId = useProfileStore((s) => s.defaultId);
  const activeWindow = useProfileStore((s) => s.activeWindow);
  const setDefaultId = useProfileStore((s) => s.setDefaultId);
  const [modal, setModal] = useState<ModalState>(null);
  const [saving, setSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function closeModal() {
    setModal(null);
    setDeleteError("");
  }

  // Add, edit and delete change the list, so they bypass the switch guard:
  // saving a profile cannot lose the unsaved edits the guard protects.
  async function saveProfile(profile: Profile, isNew: boolean) {
    await invoke("profile_save", { profile });
    await refresh();
    if (isNew) useProfileStore.getState().applySwitch(profile.id, "manual");
    closeModal();
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
        state.applySwitch(nextActive ?? "", "manual");
        if (nextActive === null) state.setActiveId(null);
      }
      if (state.defaultId === deleted) state.setDefaultId(firstId);
      closeModal();
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
    onRequestSwitch(copy.id);
  }

  return (
    <>
      <div className="flow-head">
        <div className="flow-profile-header">
          <div className="flow-profile-title-row">
            <SelectMenu
              label="Select profile"
              value={activeId}
              onSelect={onRequestSwitch}
              placeholder="Select a profile…"
              footerAction={{
                label: "New Profile",
                icon: <Plus aria-hidden="true" />,
                onRun: () => setModal({ kind: "form", mode: "add" }),
              }}
              options={profiles.map((p) => ({
                value: p.id,
                label: p.name,
                meta: p.target_exe ?? "Global (All Windows)",
                starred: defaultId === p.id,
                dot:
                  activeRun?.id === p.id ? (activeRun.ok ? "ok" : "error") : undefined,
                dotLabel:
                  activeRun?.id === p.id
                    ? activeRun.ok
                      ? "Engine Running"
                      : "Engine Failed"
                    : undefined,
              }))}
              renderOptionActions={(id, close) => {
                const p = profiles.find((x) => x.id === id);
                if (!p) return null;
                return (
                  <>
                    <button
                    className="rail-menu-item"
                    type="button"
                    onClick={() => {
                      close();
                      setModal({ kind: "form", mode: "edit", profile: p });
                    }}
                  >
                    Edit Profile
                  </button>
                  <button
                    className="rail-menu-item"
                    type="button"
                    onClick={() => void duplicateProfile(p)}
                  >
                    Duplicate
                  </button>
                  <button
                    className="rail-menu-item"
                    type="button"
                    disabled={defaultId === p.id}
                    onClick={() => {
                      setDefaultId(p.id);
                      close();
                    }}
                  >
                    Make default
                  </button>
                  <div className="rail-menu-divider" />
                  <button
                    className="rail-menu-item rail-menu-item-danger"
                    type="button"
                    onClick={() => {
                      close();
                      setModal({ kind: "delete", profile: p });
                    }}
                  >
                    Delete Profile
                  </button>
                  </>
                );
              }}
            />
            {tabs}
          </div>
          <div className="flow-profile-sub-row">
            {withoutActionCount > 0 && (
              <span className="flow-without-action">
                {withoutActionCount}{" "}
                {withoutActionCount === 1
                  ? "trigger without action"
                  : "triggers without action"}
              </span>
            )}
            {dirty && (
              <span className="flow-dirty-indicator">
                <span className="dirty-dot" aria-hidden="true" />
                Unsaved changes
              </span>
            )}
          </div>
        </div>
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
    </>
  );
}