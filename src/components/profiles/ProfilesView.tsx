import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Layers, Plus } from "lucide-react";
import { useKeyNav } from "../../hooks/useKeyNav";
import { useProfileStore } from "../../stores/useProfileStore";
import ProfileHeader from "./ProfileHeader";
import ProfileFormModal from "./modals/ProfileFormModal";
import SwitchGuard from "../common/ui/SwitchGuard";
import type { Profile } from "../../types";
import KeyboardMap from "./KeyboardMap";
import KeyMatchPicker from "./KeyMatchPicker";
import TriggerInspector from "./triggers/inspector/TriggerInspector";
import TriggerList from "./triggers/list/TriggerList";
import { useTriggerEditor } from "./triggers/useTriggerEditor";

export default function ProfilesView({
  activeRun,
}: {
  activeRun: { id: string; ok: boolean } | null;
}) {
  const activeId = useProfileStore((s) => s.activeId);
  const profiles = useProfileStore((s) => s.profiles);
  const macros = useProfileStore((s) => s.macros);
  const activeWindow = useProfileStore((s) => s.activeWindow);
  const requestSwitch = useProfileStore((s) => s.requestSwitch);
  const [createOpen, setCreateOpen] = useState(false);
  const [canvasTab, setCanvasTab] = useState<"list" | "map">("list");

  const editor = useTriggerEditor(
    profiles.find((p) => p.id === activeId) ?? null,
  );
  const {
    active,
    selected,
    selectedIdx,
    selectedChips,
    selectedMain,
    assignedMains,
    withoutActionCount,
    willDropCard,
    dirty,
    recording,
    pickerOpen,
    openMenuIdx,
    matchPicker,
    saving,
    shortcutError,
    flashAction,
    draftTriggers,
    save,
    discardChanges,
  } = editor;

  // The Keyboard tab is the only surface where a bare key press is a command,
  // so physical navigation stays off everywhere else.
  useKeyNav(
    canvasTab === "map" && !recording && !pickerOpen,
    editor.pressKey,
  );

  function takePendingSwitch() {
    const state = useProfileStore.getState();
    const pending = state.pendingSwitch;
    if (pending) state.applySwitch(pending.id, pending.source);
  }

  async function saveThenSwitch() {
    await save();
    takePendingSwitch();
  }

  function discardThenSwitch() {
    discardChanges();
    takePendingSwitch();
  }

  if (!active) {
    const hasProfiles = profiles.length > 0;
    return (
      <main className="workspace">
        <div className="flow-canvas flow-canvas-empty">
          <div className="workspace-empty-state">
            <div className="workspace-empty-icon">
              <Layers aria-hidden="true" />
            </div>
            <h3>{hasProfiles ? "No Profile Selected" : "No Profiles Yet"}</h3>
            <p>
              {hasProfiles
                ? "Choose a profile to inspect its hotkeys and automation flow, or create a new profile to get started."
                : "Create your first profile to start binding hotkeys and building automation flows."}
            </p>
            <button
              className="btn-primary"
              type="button"
              onClick={() => setCreateOpen(true)}
            >
              <Plus aria-hidden="true" />
              <span>Create Profile</span>
            </button>
          </div>
        </div>
        {createOpen && (
          <ProfileFormModal
            mode="add"
            editing={null}
            profiles={profiles}
            activeWindow={activeWindow}
            onClose={() => setCreateOpen(false)}
            onSubmit={async (profile: Profile) => {
              await invoke("profile_save", { profile });
              useProfileStore
                .getState()
                .setProfiles(await invoke<Profile[]>("profile_list"));
              useProfileStore.getState().applySwitch(profile.id, "manual");
              setCreateOpen(false);
            }}
          />
        )}
      </main>
    );
  }

  return (
    <main className="workspace">
      <div className="flow-canvas">
        <div className="flow-inner">
          <ProfileHeader
            activeRun={activeRun}
            withoutActionCount={withoutActionCount}
            dirty={dirty}
            onRequestSwitch={(id) => requestSwitch(id, "manual")}
            tabs={
              <div className="canvas-tabs" role="tablist" aria-label="Canvas view">
                <button
                  type="button"
                  role="tab"
                  aria-selected={canvasTab === "list"}
                  className={`canvas-tab ${canvasTab === "list" ? "canvas-tab-on" : ""}`}
                  onClick={() => setCanvasTab("list")}
                >
                  List
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={canvasTab === "map"}
                  className={`canvas-tab ${canvasTab === "map" ? "canvas-tab-on" : ""}`}
                  onClick={() => setCanvasTab("map")}
                >
                  Keyboard
                </button>
              </div>
            }
          />
          <SwitchGuard
            dirty={dirty}
            saving={saving}
            onSaveAndSwitch={saveThenSwitch}
            onDiscardAndSwitch={discardThenSwitch}
          />

          {canvasTab === "map" ? (
            <KeyboardMap
              assigned={assignedMains}
              selectedMain={selectedMain}
              disabled={recording}
              onPick={editor.mapKeyDown}
            />
          ) : (
            <TriggerList
              triggers={draftTriggers}
              selectedIdx={selectedIdx}
              recording={recording}
              macros={macros}
              openMenuIdx={openMenuIdx}
              onSelect={editor.selectTriggerAt}
              onToggleEnabled={(i) =>
                editor.patchAt(i, (x) => ({ ...x, enabled: !x.enabled }))
              }
              onFocusAction={editor.focusActionStep}
              onDuplicate={editor.duplicateTrigger}
              onToggleBlock={(i) =>
                editor.patchAt(i, (x) => ({ ...x, block_key: !x.block_key }))
              }
              onDelete={editor.deleteTrigger}
              onToggleMenu={editor.toggleMenu}
              onAdd={editor.addTrigger}
            />
          )}
          {matchPicker && (
            <KeyMatchPicker
              matches={matchPicker.indices.map((index) => ({
                trigger: draftTriggers[index],
                index,
              }))}
              mainKey={matchPicker.mainKey}
              createCombo={matchPicker.createCombo}
              anchor={matchPicker.anchor}
              onPick={(index) => {
                editor.selectTriggerAt(index);
                editor.setMatchPicker(null);
              }}
              onCreate={() => {
                editor.openEmptyOn(matchPicker.createCombo);
                editor.setMatchPicker(null);
              }}
              onClose={() => editor.setMatchPicker(null)}
            />
          )}
        </div>
      </div>

      <TriggerInspector
        selected={selected ?? undefined}
        selectedIdx={selectedIdx}
        selectedChips={selectedChips}
        single={selected?.actions[0] ?? null}
        dirty={dirty}
        saving={saving}
        recording={recording}
        pickerOpen={pickerOpen}
        willDropCard={willDropCard}
        flashAction={flashAction}
        shortcutError={shortcutError}
        onStartRecording={editor.startRecording}
        onPickerOpen={editor.openPicker}
        onPickerSelect={editor.applyPickerShortcut}
        onPickerClose={() => editor.setPickerOpen(false)}
        onClearShortcut={editor.clearSelectedShortcut}
        onPatchSelected={editor.patchSelected}
        onSelectActionType={editor.selectActionType}
        onSetSingleAction={editor.setSingleAction}
        onSave={save}
        onDiscard={discardChanges}
        onRemoveSelected={editor.removeSelected}
        onAddTrigger={editor.addTrigger}
      />
    </main>
  );
}