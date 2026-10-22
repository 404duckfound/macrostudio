import { useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { AlertTriangle, Check, CircleAlert, Copy, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useProfileStore } from "../../stores/useProfileStore";
import SelectMenu from "../common/ui/SelectMenu";
import ProfileDeleteModal from "./modals/ProfileDeleteModal";
import ProfileFormModal from "./modals/ProfileFormModal";
import {
  dropReportMessage,
  type DraftDropReport,
} from "./triggers/triggerDraft";
import type { Profile, Trigger } from "../../types";

type ModalState =
  | { kind: "form"; mode: "add" }
  | { kind: "form"; mode: "edit"; profile: Profile }
  | { kind: "delete"; profile: Profile }
  | null;

interface ProfileHeaderProps {
  activeRun: { id: string; ok: boolean } | null;
  /** Why the engine could not start the profile, if it failed. */
  runError: string | null;
  /** Cards the current save would drop, and why. */
  dropSummary: DraftDropReport;
  /** What the last save left out, shown until the next edit. */
  saveNotice: string | null;
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
    actions: t.actions.map((a) => ({ ...a })),
  }));
}

export default function ProfileHeader({
  activeRun,
  runError,
  dropSummary,
  saveNotice,
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

  // Editing a profile name or its scope never touches the trigger drafts, so
  // it can be saved right away. A *new* profile switches away from the
  // current one, and that switch goes through the guard like any other: the
  // unsaved edits of the profile on screen must not disappear with it.
  async function saveProfile(profile: Profile, isNew: boolean) {
    await invoke("profile_save", { profile });
    await refresh();
    if (isNew) onRequestSwitch(profile.id);
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
            <div className="flow-head-select">
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
                      <Pencil className="rail-menu-icon" aria-hidden="true" />
                      Edit Profile
                    </button>
                    <button
                      className="rail-menu-item"
                      type="button"
                      onClick={() => void duplicateProfile(p)}
                    >
                      <Copy className="rail-menu-icon" aria-hidden="true" />
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
                      <Star
                        className="rail-menu-icon"
                        aria-hidden="true"
                        fill={defaultId === p.id ? "currentColor" : "none"}
                      />
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
                      <Trash2 className="rail-menu-icon" aria-hidden="true" />
                      Delete Profile
                    </button>
                  </>
                );
              }}
            />
            </div>
            {/* One place for every screen-level message: engine failure, unsaved
                work, a save that would drop cards, and what the last save left
                out. All of them share the pill shape so none shouts louder. */}
            {(runError || dirty || dropSummary.total > 0 || saveNotice) && (
            <div className="flow-notes">
            {runError && (
              <span className="flow-note flow-note-danger" role="alert">
                <CircleAlert aria-hidden="true" />
                {runError}
              </span>
            )}
            {dirty && (
              <span className="flow-note flow-note-warn">
                <span className="dirty-dot" aria-hidden="true" />
                Unsaved changes
              </span>
            )}
            {dropSummary.total > 0 && (
              <span className="flow-note flow-note-warn">
                <AlertTriangle aria-hidden="true" />
                {dropReportMessage(dropSummary)}
              </span>
            )}
            {saveNotice && (
              <span className="flow-note flow-note-info">
                <Check aria-hidden="true" />
                {saveNotice}
              </span>
            )}
            </div>
            )}
            {tabs && <div className="flow-head-tabs">{tabs}</div>}
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