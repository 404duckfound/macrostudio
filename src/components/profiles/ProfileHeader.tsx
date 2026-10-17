import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AppWindow, Pencil, Star } from "lucide-react";
import { useProfileStore } from "../../stores/useProfileStore";
import SelectMenu from "../common/SelectMenu";
import ProfileDeleteModal from "./modals/ProfileDeleteModal";
import ProfileFormModal from "./modals/ProfileFormModal";
import type { Profile, Trigger } from "../../types";

type ModalState =
  | { kind: "form"; mode: "add" }
  | { kind: "form"; mode: "edit" }
  | { kind: "delete" }
  | null;

interface ProfileHeaderProps {
  active: Profile;
  activeRun: { id: string; ok: boolean } | null;
  triggerCount: number;
  withoutActionCount: number;
  dirty: boolean;
  onRequestSwitch: (id: string) => void;
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

function pluralTriggers(n: number): string {
  return `${n} ${n === 1 ? "trigger" : "triggers"}`;
}

export default function ProfileHeader({
  active,
  activeRun,
  triggerCount,
  withoutActionCount,
  dirty,
  onRequestSwitch,
}: ProfileHeaderProps) {
  const profiles = useProfileStore((s) => s.profiles);
  const activeId = useProfileStore((s) => s.activeId);
  const defaultId = useProfileStore((s) => s.defaultId);
  const activeWindow = useProfileStore((s) => s.activeWindow);
  const setDefaultId = useProfileStore((s) => s.setDefaultId);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [saving, setSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick() {
      setMenuOpen(false);
    }
    function onDocKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [menuOpen]);

  function closeModal() {
    setModal(null);
    setDeleteError("");
  }

  // Add, edit and delete change the list, so they bypass the switch guard:
  // saving a profile cannot lose the unsaved edits the guard protects.
  async function saveProfile(profile: Profile, isNew: boolean) {
    await invoke("profile_save", { profile });
    const list = await refresh();
    if (isNew) {
      useProfileStore
        .getState()
        .applySwitch(profile.id, "manual");
    } else if (list.length > 0) {
      setMenuOpen(false);
    }
    closeModal();
  }

  async function deleteProfile() {
    if (modal?.kind !== "delete") return;
    setSaving(true);
    setDeleteError("");
    try {
      const deleted = active.id;
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
    setMenuOpen(false);
    onRequestSwitch(copy.id);
  }

  function optionMeta(p: Profile): string {
    const parts: string[] = [];
    if (defaultId === p.id) parts.push("Default");
    parts.push(pluralTriggers(p.triggers.length));
    parts.push(p.target_exe ?? "All windows");
    return parts.join(" · ");
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
              options={profiles.map((p) => ({
                value: p.id,
                label: p.name,
                meta: optionMeta(p),
                dot:
                  activeRun?.id === p.id ? (activeRun.ok ? "ok" : "error") : undefined,
              }))}
            />
            {active.target_exe ? (
              <span
                className="scope-badge scope-badge-linked"
                title={`Linked application: ${active.target_exe}`}
              >
                <AppWindow className="scope-badge-icon" aria-hidden="true" />
                {active.target_exe}
              </span>
            ) : (
              <span className="scope-badge" title="Applies across all windows">
                Global (All Windows)
              </span>
            )}
            {activeRun && (
              <span
                role="img"
                aria-label={activeRun.ok ? "Engine Running" : "Engine Failed"}
                title={activeRun.ok ? "Engine Running" : "Engine Failed"}
                className={`flow-run-dot ${
                  activeRun.ok ? "" : "flow-run-dot-error"
                }`}
              />
            )}
            {defaultId === active.id && (
              <span className="flow-default-star" title="Default profile">
                <Star aria-hidden="true" fill="currentColor" />
              </span>
            )}
            <div className="rail-menu-wrap">
              <button
                className="rail-add"
                type="button"
                aria-label="Profile options"
                title="Profile options"
                aria-expanded={menuOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((o) => !o);
                }}
              >
                <Pencil aria-hidden="true" />
              </button>
              {menuOpen && (
                <div
                  className="rail-menu rail-menu-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="rail-menu-item"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setModal({ kind: "form", mode: "add" });
                    }}
                  >
                    New Profile
                  </button>
                  <div className="rail-menu-divider" />
                  <button
                    className="rail-menu-item"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setModal({ kind: "form", mode: "edit" });
                    }}
                  >
                    Edit Profile
                  </button>
                  <button
                    className="rail-menu-item"
                    type="button"
                    onClick={() => void duplicateProfile(active)}
                  >
                    Duplicate
                  </button>
                  <button
                    className="rail-menu-item"
                    type="button"
                    disabled={defaultId === active.id}
                    onClick={() => {
                      setDefaultId(active.id);
                      setMenuOpen(false);
                    }}
                  >
                    Make default
                  </button>
                  <div className="rail-menu-divider" />
                  <button
                    className="rail-menu-item rail-menu-item-danger"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setModal({ kind: "delete" });
                    }}
                  >
                    Delete Profile
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flow-profile-sub-row">
            <span className="flow-trigger-counter">
              {triggerCount} {triggerCount === 1 ? "trigger" : "triggers"} configured
              {withoutActionCount > 0 && (
                <>
                  {" · "}
                  <span className="flow-without-action">
                    {withoutActionCount} without action
                  </span>
                </>
              )}
            </span>
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
          editing={modal.mode === "edit" ? active : null}
          profiles={profiles}
          activeWindow={activeWindow}
          onClose={closeModal}
          onSubmit={saveProfile}
        />
      )}

      {modal?.kind === "delete" && (
        <ProfileDeleteModal
          profile={active}
          saving={saving}
          error={deleteError}
          onClose={closeModal}
          onConfirm={deleteProfile}
        />
      )}
    </>
  );
}