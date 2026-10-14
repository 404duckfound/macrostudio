import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertCircle,
  AppWindow,
  Ban,
  Copy,
  Ellipsis,
  Eye,
  Keyboard,
  Layers,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  Undo2,
} from "lucide-react";
import { useProfileStore } from "../../stores/useProfileStore";
import { useKeyCapture } from "../../hooks/useKeyCapture";
import { parseTrigger } from "../../lib/keys";
import { buildCombo, splitCombo } from "../../lib/keyCatalog";
import type { Macro, MacroAction, ModSide, Profile, Trigger } from "../../types";
import ActionEditor from "./actions/ActionEditor";
import ActionTypeCard from "./actions/ActionTypeCard";
import Chips from "./Chips";
import KeyboardMap from "./KeyboardMap";
import ShortcutField from "./ShortcutField";
import TriggerModifiers from "./TriggerModifiers";
import { cleanDraft, toDrafts } from "./triggerDraft";

function actionPreviewLabel(
  action: MacroAction | null | undefined,
  macros: Macro[],
): string | null {
  if (!action) return null;
  switch (action.type) {
    case "key":
      return action.key ? `Key: ${action.key}` : "Key: (empty)";
    case "mouse":
      return `Mouse: ${action.button}`;
    case "macro": {
      if (!action.macro_id) return "Macro: (empty)";
      const found = macros.find((m) => m.id === action.macro_id);
      return found ? `Macro: ${found.name || "(unnamed)"}` : "Macro: (deleted)";
    }
    case "script":
      return "AHK Script";
  }
}

// AltGr is LeftCtrl + RightAlt physically: pin the recorded combo to those
// sides so the trigger fires on AltGr alone instead of any Ctrl+Alt.
function altGrSides(combo: string): Record<string, ModSide> {
  const parts = combo.split("+").map((p) => p.trim());
  const sides: Record<string, ModSide> = {};
  if (parts.includes("Ctrl")) sides["Ctrl"] = "left";
  if (parts.includes("Alt")) sides["Alt"] = "right";
  return sides;
}

export default function Workspace() {
  const activeId = useProfileStore((s) => s.activeId);
  const profiles = useProfileStore((s) => s.profiles);
  const macros = useProfileStore((s) => s.macros);
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
  const willDropCard = cleanTriggers.length !== draftTriggers.length;
  const dirty =
    active != null && JSON.stringify(cleanTriggers) !== JSON.stringify(active.triggers);

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

  function discardChanges() {
    setDraftTriggers(toDrafts(active?.triggers));
    setSelectedIdx(0);
    setRecording(false);
    setPickerOpen(false);
    setShortcutError(null);
  }

  if (!active) {
    return (
      <main className="workspace">
        <div className="flow-canvas flow-canvas-empty">
          <div className="workspace-empty-state">
            <div className="workspace-empty-icon">
              <Layers aria-hidden="true" />
            </div>
            <h3>No Profile Selected</h3>
            <p>
              Choose a profile from the sidebar to inspect its hotkeys and automation flow, or create a new profile to get started.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="workspace">
      <div className="flow-canvas">
        <div className="flow-inner">
          <div className="flow-head">
            <div className="flow-profile-header">
              <div className="flow-profile-title-row">
                <h2 className="flow-profile-title">{active.name}</h2>
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
              </div>
              <div className="flow-profile-sub-row">
                <span className="flow-trigger-counter">
                  {cleanTriggers.length} {cleanTriggers.length === 1 ? "trigger" : "triggers"} configured
                </span>
                {dirty && (
                  <span className="flow-dirty-indicator">
                    <span className="dirty-dot" />
                    Unsaved changes
                  </span>
                )}
              </div>
            </div>
          </div>

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

          {canvasTab === "map" ? (
            <KeyboardMap
              assigned={assignedMains}
              selectedMain={selectedMain}
              disabled={!selected || recording}
              onPick={assignMapKey}
            />
          ) : (
          <>
          <div className="trigger-card-list">
            {draftTriggers.map((t, i) => {
              const preview = actionPreviewLabel(t.actions[0], macros);
              const menuOpen = openMenuIdx === i;
              return (
                <div
                  key={`${i}-${t.shortcut}`}
                  className={`trigger-card ${i === sel ? "trigger-card-selected" : ""} ${
                    recording && i === sel ? "trigger-card-recording" : ""
                  } ${t.enabled ? "" : "trigger-card-off"}`}
                  onClick={() => {
                    setSelectedIdx(i);
                    setRecording(false);
                    setPickerOpen(false);
                  }}
                  title="Click to select trigger"
                >
                  <div className="trigger-card-left">
                    <div className="trigger-icon">
                      <Keyboard aria-hidden="true" />
                    </div>
                    <div className="trigger-card-content">
                      <div className="trigger-chips">
                        {recording && i === sel ? (
                          <span className="trigger-recording-hint">
                            Press a key or shortcut… (Esc to cancel)
                          </span>
                        ) : (
                          <Chips parts={parseTrigger(t.shortcut)} />
                        )}
                      </div>
                      {preview ? (
                        <span className="trigger-action-pill">{preview}</span>
                      ) : (
                        <span className="trigger-noaction">No action</span>
                      )}
                    </div>
                  </div>
                  <div className="trigger-card-right">
                    <span
                      className={`trigger-pass ${t.block_key ? "trigger-pass-block" : ""}`}
                      title={
                        t.block_key
                          ? "Original keypress is blocked by Macro Studio"
                          : "Original keypress passes through to active app (~)"
                      }
                    >
                      {t.block_key ? (
                        <Ban aria-hidden="true" />
                      ) : (
                        <Eye aria-hidden="true" />
                      )}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={t.enabled}
                      aria-label={t.enabled ? "Disable trigger" : "Enable trigger"}
                      title={t.enabled ? "Disable trigger" : "Enable trigger"}
                      className={`switch switch-sm ${t.enabled ? "switch-on" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        patchAt(i, (x) => ({ ...x, enabled: !x.enabled }));
                      }}
                    >
                      <span className="switch-thumb" />
                    </button>
                    <div className="trigger-menu-wrap">
                      <button
                        type="button"
                        className="rail-dots"
                        aria-label="Trigger options"
                        title="Options"
                        aria-expanded={menuOpen}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuIdx(menuOpen ? null : i);
                        }}
                      >
                        <Ellipsis aria-hidden="true" />
                      </button>
                      {menuOpen && (
                        <div
                          className="rail-menu"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuIdx(null);
                          }}
                        >
                          <button
                            type="button"
                            className="rail-menu-item"
                            onClick={() => duplicateTrigger(i)}
                          >
                            <Copy className="rail-menu-icon" aria-hidden="true" />
                            Duplicate
                          </button>
                          <button
                            type="button"
                            className="rail-menu-item"
                            onClick={() =>
                              patchAt(i, (x) => ({ ...x, block_key: !x.block_key }))
                            }
                          >
                            {t.block_key ? "Unblock original key" : "Block original key"}
                          </button>
                          <div className="rail-menu-divider" />
                          <button
                            type="button"
                            className="rail-menu-item rail-menu-item-danger"
                            onClick={() => deleteTrigger(i)}
                          >
                            <Trash2 className="rail-menu-icon" aria-hidden="true" />
                            Delete Trigger
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            className="trigger-add-placeholder"
            onClick={addTrigger}
          >
            <Plus aria-hidden="true" />
            <span>Add new trigger</span>
          </button>
          </>
          )}
        </div>
      </div>

      <aside className="inspector">
        <div className="inspector-head">
          <div className="inspector-head-left">
            <h3>Trigger Inspector</h3>
          </div>
          {dirty && (
            <span className="inspector-dirty-tag">Modified</span>
          )}
        </div>

        {selected ? (
          <>
            <div className="inspector-body">
              <section className="step-card" aria-label="Step 1: When">
                <div className="step-head">
                  <span className="step-num" aria-hidden="true">1</span>
                  <span className="step-title">When</span>
                  {selectedChips.length > 0 && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={clearSelectedShortcut}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <ShortcutField
                  parts={selectedChips}
                  combo={selected?.shortcut ?? ""}
                  recording={recording}
                  pickerOpen={pickerOpen}
                  onRecord={startRecording}
                  onPickerOpen={openPicker}
                  onPickerSelect={applyPickerShortcut}
                  onPickerClose={() => setPickerOpen(false)}
                  error={shortcutError}
                />
                {willDropCard && (
                  <div className="inline-warn" role="alert">
                    <AlertCircle className="warn-icon" aria-hidden="true" />
                    <span>A trigger has an empty or duplicated shortcut. It will be omitted on save.</span>
                  </div>
                )}
              </section>

              <section className="step-card" aria-label="Step 2: Modifiers">
                <div className="step-head">
                  <span className="step-num" aria-hidden="true">2</span>
                  <span className="step-title">Modifiers</span>
                </div>
                <TriggerModifiers
                  key={sel}
                  trigger={selected}
                  onPatch={patchSelected}
                />
              </section>

              <section className="step-card" aria-label="Step 3: Action">
                <div className="step-head">
                  <span className="step-num" aria-hidden="true">3</span>
                  <span className="step-title">Action</span>
                  {single && (
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setSingleAction(null)}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <ActionTypeCard
                  value={single?.type ?? ""}
                  onSelect={(kind) => {
                    if (kind === "") setSingleAction(null);
                    else selectActionType(kind);
                  }}
                />
                {single?.type === "key" && single.key.length === 0 && (
                  <div className="inline-warn">
                    <AlertCircle className="warn-icon" aria-hidden="true" />
                    <span>Pick a key target, otherwise this trigger will execute nothing.</span>
                  </div>
                )}
                {!single && (
                  <div className="inline-warn">
                    <AlertCircle className="warn-icon" aria-hidden="true" />
                    <span>No action selected — this trigger will execute nothing.</span>
                  </div>
                )}
                {single && (
                  <ActionEditor action={single} onChange={setSingleAction} />
                )}
              </section>
            </div>

            <div className="inspector-foot">
              <button
                type="button"
                className={`btn-trigger-save ${dirty ? "btn-trigger-save-dirty" : ""}`}
                onClick={save}
                disabled={saving || !dirty}
                title={dirty ? "Save changes to profile" : "No changes to save"}
              >
                {dirty && !saving && (
                  <span className="save-dot" aria-hidden="true" />
                )}
                <Save aria-hidden="true" />
                <span>{saving ? "Saving…" : "Save Changes"}</span>
              </button>
              <button
                type="button"
                className="btn-trigger-undo"
                onClick={discardChanges}
                disabled={!dirty || saving}
                title={dirty ? "Discard unsaved changes" : "No unsaved changes"}
                aria-label="Discard unsaved changes"
              >
                <Undo2 aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn-trigger-delete"
                onClick={removeSelected}
                disabled={!selected}
                title="Delete this trigger"
                aria-label="Delete this trigger"
              >
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          </>
        ) : (
          <div className="inspector-empty-state">
            <div className="inspector-empty-icon">
              <SlidersHorizontal aria-hidden="true" />
            </div>
            <h4>No Trigger Selected</h4>
            <p>
              Select a trigger card from the canvas to edit its shortcut key and macro actions, or add a new trigger.
            </p>
            <button
              type="button"
              className="btn-secondary inspector-empty-btn"
              onClick={addTrigger}
            >
              <Plus aria-hidden="true" />
              <span>Add Trigger</span>
            </button>
          </div>
        )}
      </aside>
    </main>
  );
}
