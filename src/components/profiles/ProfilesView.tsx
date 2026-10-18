import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Layers, Plus } from "lucide-react";
import { useProfileStore } from "../../stores/useProfileStore";
import ProfileHeader from "./ProfileHeader";
import ProfileFormModal from "./modals/ProfileFormModal";
import SwitchGuard from "../common/ui/SwitchGuard";
import { useKeyCapture } from "../../hooks/useKeyCapture";
import { parseTrigger } from "../../lib/keys";
import { buildCombo, splitCombo } from "../../lib/keyCatalog";
import type { MacroAction, ModSide, Profile, Trigger } from "../../types";
import KeyboardMap from "./KeyboardMap";
import TriggerInspector from "./triggers/inspector/TriggerInspector";
import TriggerList from "./triggers/list/TriggerList";
import { cleanDraft, toDrafts } from "./triggers/triggerDraft";

type ActiveRun = { id: string; ok: boolean } | null;

// AltGr is LeftCtrl + RightAlt physically: pin the recorded combo to those
// sides so the trigger fires on AltGr alone instead of any Ctrl+Alt.
function altGrSides(combo: string): Record<string, ModSide> {
  const parts = combo.split("+").map((p) => p.trim());
  const sides: Record<string, ModSide> = {};
  if (parts.includes("Ctrl")) sides["Ctrl"] = "left";
  if (parts.includes("Alt")) sides["Alt"] = "right";
  return sides;
}

export default function ProfilesView({ activeRun }: { activeRun: ActiveRun }) {
  const activeId = useProfileStore((s) => s.activeId);
  const profiles = useProfileStore((s) => s.profiles);
  const macros = useProfileStore((s) => s.macros);
  const requestSwitch = useProfileStore((s) => s.requestSwitch);
  const [createOpen, setCreateOpen] = useState(false);
  const active = profiles.find((p) => p.id === activeId) ?? null;

  const [draftTriggers, setDraftTriggers] = useState<Trigger[]>(
    active?.triggers ?? [],
  );
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);
  const [canvasTab, setCanvasTab] = useState<"list" | "map">("list");
  const [saving, setSaving] = useState(false);
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  useEffect(() => {
    setDraftTriggers(toDrafts(active?.triggers));
    setSelectedIdx(0);
    setRecording(false);
    setPickerOpen(false);
  }, [active?.id, active?.triggers]);

  useEffect(() => {
    if (openMenuIdx === null) return;
    function onDocClick() {
      setOpenMenuIdx(null);
    }
    function onDocKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuIdx(null);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [openMenuIdx]);

  const sel = Math.min(selectedIdx, Math.max(0, draftTriggers.length - 1));
  const selected = draftTriggers[sel] ?? null;

  const captureShortcut = useCallback(
    (combo: string, altGr = false) => {
      const clash = draftTriggers.some(
        (x, i) => i !== sel && x.shortcut.trim() === combo.trim(),
      );
      if (clash) {
        setShortcutError(`"${combo.trim()}" is already used by another trigger.`);
        setRecording(false);
        return;
      }
      setShortcutError(null);
      setDraftTriggers((prev) =>
        prev.map((x, i) =>
          i === sel
            ? { ...x, shortcut: combo, ...(altGr ? { mod_sides: altGrSides(combo) } : {}) }
            : x,
        ),
      );
      setRecording(false);
    },
    [draftTriggers, sel],
  );

  const cancelCapture = useCallback(() => setRecording(false), []);

  // Manual picker writes use the identical clash rule as Record. Manual
  // ticks carry no side info, so stale sides for removed modifiers are
  // pruned; sides for remaining modifiers are kept (AltGr record followed
  // by a manual tick must not lose its left/right pins).
  const applyPickerShortcut = useCallback(
    (combo: string) => {
      const clash = draftTriggers.some(
        (x, i) => i !== sel && x.shortcut.trim() === combo.trim(),
      );
      if (clash) {
        setShortcutError(`"${combo.trim()}" is already used by another trigger.`);
        setPickerOpen(false);
        return;
      }
      setShortcutError(null);
      const keep = new Set(combo.split("+").map((p) => p.trim()));
      setDraftTriggers((prev) =>
        prev.map((x, i) => {
          if (i !== sel) return x;
          const mod_sides: Record<string, ModSide> = {};
          for (const [mod, side] of Object.entries(x.mod_sides ?? {})) {
            if (keep.has(mod)) mod_sides[mod] = side;
          }
          return { ...x, shortcut: combo, mod_sides };
        }),
      );
    },
    [draftTriggers, sel],
  );

  function openPicker() {
    setRecording(false);
    setShortcutError(null);
    setPickerOpen(true);
  }

  function startRecording() {
    setPickerOpen(false);
    setShortcutError(null);
    setRecording(true);
  }

  useKeyCapture(recording, captureShortcut, cancelCapture, {
    ignoreLeftClick: true,
  });

  const selectedChips = parseTrigger(selected?.shortcut ?? "");
  const selectedMain = (() => {
    const { main } = splitCombo(selected?.shortcut ?? "");
    return main ? main.toUpperCase() : null;
  })();
  const assignedMains = useMemo(() => {
    const set = new Set<string>();
    for (const t of draftTriggers) {
      const { main } = splitCombo(t.shortcut);
      if (main) set.add(main.toUpperCase());
    }
    return set;
  }, [draftTriggers]);

  // Map assign keeps the selected trigger's modifiers and swaps only the
  // main key; clash validation is shared with the picker path.
  function assignMapKey(name: string) {
    const { modifiers } = splitCombo(selected?.shortcut ?? "");
    applyPickerShortcut(buildCombo(modifiers, name, false));
  }
  const single = selected?.actions[0] ?? null;
  const cleanTriggers = useMemo(
    () => cleanDraft(draftTriggers),
    [draftTriggers],
  );
  const withoutActionCount = useMemo(
    () => cleanTriggers.filter((t) => t.actions.length === 0).length,
    [cleanTriggers],
  );
  const willDropCard = cleanTriggers.length !== draftTriggers.length;
  const dirty =
    active != null && JSON.stringify(cleanTriggers) !== JSON.stringify(active.triggers);

  function selectTriggerAt(idx: number) {
    setSelectedIdx(idx);
    setRecording(false);
    setPickerOpen(false);
  }

  function patchSelected(patch: (t: Trigger) => Trigger) {
    setDraftTriggers((prev) => prev.map((x, i) => (i === sel ? patch(x) : x)));
  }

  function addTrigger() {
    setDraftTriggers((prev) => [
      ...prev,
      { shortcut: "", actions: [], block_key: false, fire_on_release: false, mod_sides: {}, wildcard: false, force_hook: false, enabled: true },
    ]);
    setSelectedIdx(draftTriggers.length);
  }

  function patchAt(idx: number, patch: (t: Trigger) => Trigger) {
    setDraftTriggers((prev) => prev.map((x, i) => (i === idx ? patch(x) : x)));
  }

  function duplicateTrigger(idx: number) {
    setDraftTriggers((prev) => {
      const src = prev[idx];
      if (!src) return prev;
      const copy: Trigger = {
        ...src,
        mod_sides: { ...src.mod_sides },
        actions: src.actions.map((a) => ({ ...a })),
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setSelectedIdx(idx + 1);
    setOpenMenuIdx(null);
  }

  function deleteTrigger(idx: number) {
    setDraftTriggers((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIdx((cur) => Math.max(0, Math.min(cur, draftTriggers.length - 2)));
    setRecording(false);
    setPickerOpen(false);
    setOpenMenuIdx(null);
  }

  function removeSelected() {
    setDraftTriggers((prev) => prev.filter((_, i) => i !== sel));
    setSelectedIdx(Math.max(0, sel - 1));
    setRecording(false);
    setPickerOpen(false);
  }

  function setSingleAction(next: MacroAction | null) {
    patchSelected((x) => ({ ...x, actions: next ? [next] : [] }));
  }

  function clearSelectedShortcut() {
    patchSelected((x) => ({ ...x, shortcut: "" }));
  }

  const [flashAction, setFlashAction] = useState(false);

  // Row "+ Assign action": select the row, then bring the inspector's
  // Action step into view with a brief ring flash.
  function focusActionStep(idx: number) {
    setSelectedIdx(idx);
    setRecording(false);
    setPickerOpen(false);
    requestAnimationFrame(() => {
      document
        .getElementById("inspector-step-action")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    setFlashAction(true);
    window.setTimeout(() => setFlashAction(false), 1300);
  }

  function selectActionType(type: MacroAction["type"]) {
    let fresh: MacroAction;
    switch (type) {
      case "mouse":
        fresh = { type: "mouse", button: "Left", x: 0, y: 0 };
        break;
      case "macro":
        fresh = { type: "macro", macro_id: "" };
        break;
      case "script":
        fresh = { type: "script", code: "" };
        break;
      case "key":
        fresh = {
          type: "key",
          key: "",
          behavior: "tap",
          pre_delay_ms: 0,
          repeat: 1,
        };
        break;
    }
    setSingleAction(fresh);
  }

  async function persist(triggers: Trigger[]) {
    if (!active) return;
    setSaving(true);
    try {
      const updated: Profile = { ...active, triggers };
      await invoke("profile_save", { profile: updated });
      const list = await invoke<Profile[]>("profile_list");
      useProfileStore.getState().setProfiles(list);
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (!active) return;
    await persist(cleanTriggers);
  }

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

  function discardChanges() {
    setDraftTriggers(toDrafts(active?.triggers));
    setSelectedIdx(0);
    setRecording(false);
    setPickerOpen(false);
    setShortcutError(null);
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
            activeWindow={useProfileStore.getState().activeWindow}
            onClose={() => setCreateOpen(false)}
            onSubmit={async (profile) => {
              await invoke("profile_save", { profile });
              useProfileStore.getState().setProfiles(
                await invoke<Profile[]>("profile_list"),
              );
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
              disabled={!selected || recording}
              onPick={assignMapKey}
            />
          ) : (
            <TriggerList
              triggers={draftTriggers}
              selectedIdx={sel}
              recording={recording}
              macros={macros}
              openMenuIdx={openMenuIdx}
              onSelect={selectTriggerAt}
              onToggleEnabled={(i) =>
                patchAt(i, (x) => ({ ...x, enabled: !x.enabled }))
              }
              onFocusAction={focusActionStep}
              onDuplicate={duplicateTrigger}
              onToggleBlock={(i) =>
                patchAt(i, (x) => ({ ...x, block_key: !x.block_key }))
              }
              onDelete={deleteTrigger}
              onToggleMenu={(i) => setOpenMenuIdx(openMenuIdx === i ? null : i)}
              onAdd={addTrigger}
            />
          )}
        </div>
      </div>

      <TriggerInspector
        selected={selected}
        selectedIdx={sel}
        selectedChips={selectedChips}
        single={single}
        dirty={dirty}
        saving={saving}
        recording={recording}
        pickerOpen={pickerOpen}
        willDropCard={willDropCard}
        flashAction={flashAction}
        shortcutError={shortcutError}
        onStartRecording={startRecording}
        onPickerOpen={openPicker}
        onPickerSelect={applyPickerShortcut}
        onPickerClose={() => setPickerOpen(false)}
        onClearShortcut={clearSelectedShortcut}
        onPatchSelected={patchSelected}
        onSelectActionType={selectActionType}
        onSetSingleAction={setSingleAction}
        onSave={save}
        onDiscard={discardChanges}
        onRemoveSelected={removeSelected}
        onAddTrigger={addTrigger}
      />
    </main>
  );
}