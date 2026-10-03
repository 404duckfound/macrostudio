import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  AlertCircle,
  AppWindow,
  Ban,
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
import type { MacroAction, Profile, Trigger } from "../../types";
import ActionEditor from "./actions/ActionEditor";
import ActionTypeCard from "./actions/ActionTypeCard";
import BlockKeyToggle from "./BlockKeyToggle";
import Chips from "./Chips";
import ShortcutField from "./ShortcutField";
import { cleanDraft, toDrafts } from "./triggerDraft";

function actionPreviewLabel(action?: MacroAction | null): string | null {
  if (!action) return null;
  switch (action.type) {
    case "key":
      return action.key ? `Key: ${action.key}` : "Key: (empty)";
    case "keys":
      return action.keys ? `Text: "${action.keys}"` : "Text: (empty)";
    case "mouse":
      return `Mouse: ${action.button}`;
    case "custom":
      return `Custom: ${action.blocks.length} ${action.blocks.length === 1 ? "block" : "blocks"}`;
    case "script":
      return "AHK Script";
  }
}

export default function Workspace({
  activeRun,
}: {
  activeRun?: { id: string; ok: boolean } | null;
}) {
  const activeId = useProfileStore((s) => s.activeId);
  const profiles = useProfileStore((s) => s.profiles);
  const active = profiles.find((p) => p.id === activeId) ?? null;

  const [draftTriggers, setDraftTriggers] = useState<Trigger[]>(
    active?.triggers ?? [],
  );
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [draftBlockKey, setDraftBlockKey] = useState(
    active?.block_key ?? false,
  );
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  useEffect(() => {
    setDraftTriggers(toDrafts(active?.triggers));
    setSelectedIdx(0);
    setDraftBlockKey(active?.block_key ?? false);
    setRecording(false);
  }, [active?.id, active?.triggers, active?.block_key]);

  const sel = Math.min(selectedIdx, Math.max(0, draftTriggers.length - 1));
  const selected = draftTriggers[sel] ?? null;

  const captureShortcut = useCallback(
    (combo: string) => {
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
        prev.map((x, i) => (i === sel ? { ...x, shortcut: combo } : x)),
      );
      setRecording(false);
    },
    [draftTriggers, sel],
  );

  const cancelCapture = useCallback(() => setRecording(false), []);

  useKeyCapture(recording, captureShortcut, cancelCapture, {
    ignoreLeftClick: true,
  });

  const selectedChips = parseTrigger(selected?.shortcut ?? "");
  const single = selected?.actions[0] ?? null;
  const cleanTriggers = useMemo(
    () => cleanDraft(draftTriggers),
    [draftTriggers],
  );
  const willDropCard = cleanTriggers.length !== draftTriggers.length;
  const dirty =
    active != null &&
    (JSON.stringify(cleanTriggers) !== JSON.stringify(active.triggers) ||
      draftBlockKey !== active.block_key);

  function patchSelected(patch: (t: Trigger) => Trigger) {
    setDraftTriggers((prev) => prev.map((x, i) => (i === sel ? patch(x) : x)));
  }

  function addTrigger() {
    setDraftTriggers((prev) => [...prev, { shortcut: "", actions: [] }]);
    setSelectedIdx(draftTriggers.length);
  }

  function removeSelected() {
    setDraftTriggers((prev) => prev.filter((_, i) => i !== sel));
    setSelectedIdx(Math.max(0, sel - 1));
    setRecording(false);
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
      case "keys":
        fresh = { type: "keys", keys: "" };
        break;
      case "mouse":
        fresh = { type: "mouse", button: "Left", x: 0, y: 0 };
        break;
      case "custom":
        fresh = { type: "custom", blocks: [] };
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

  async function persist(triggers: Trigger[], blockKey: boolean) {
    if (!active) return;
    setSaving(true);
    try {
      const updated: Profile = {
        ...active,
        triggers,
        block_key: blockKey,
      };
      await invoke("profile_save", { profile: updated });
      const list = await invoke<Profile[]>("profile_list");
      useProfileStore.getState().setProfiles(list);
    } finally {
      setSaving(false);
    }
  }

  async function save() {
    if (!active) return;
    await persist(cleanTriggers, draftBlockKey);
  }

  function discardChanges() {
    setDraftTriggers(toDrafts(active?.triggers));
    setSelectedIdx(0);
    setDraftBlockKey(active?.block_key ?? false);
    setRecording(false);
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
                {activeRun?.id === active.id && (
                  <span
                    className={`telemetry-badge ${
                      activeRun.ok ? "telemetry-active" : "telemetry-error"
                    }`}
                  >
                    <span className="telemetry-dot" />
                    {activeRun.ok ? "Engine Active" : "Engine Error"}
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

          <div className="trigger-card-list">
            {draftTriggers.map((t, i) => {
              const preview = actionPreviewLabel(t.actions[0]);
              return (
                <div
                  key={`${i}-${t.shortcut}`}
                  className={`trigger-card ${i === sel ? "trigger-card-selected" : ""} ${
                    recording && i === sel ? "trigger-card-recording" : ""
                  }`}
                  onClick={() => {
                    setSelectedIdx(i);
                    setRecording(false);
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
                      {preview && <span className="trigger-action-pill">{preview}</span>}
                    </div>
                  </div>
                  <span
                    className={`trigger-pass ${draftBlockKey ? "trigger-pass-block" : ""}`}
                    title={
                      draftBlockKey
                        ? "Original keypress is blocked by Macro Studio"
                        : "Original keypress passes through to active app (~)"
                    }
                  >
                    {draftBlockKey ? (
                      <Ban aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )}
                  </span>
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
          {draftTriggers.length === 1 && (
            <div className="flow-canvas-tip" role="note">
              <span className="flow-canvas-tip-mark" aria-hidden="true" />
              <span>Use the inspector to edit this trigger’s shortcut and action.</span>
            </div>
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
              <section className="inspector-section">
                <div className="section-head">
                  <span className="section-label">Shortcut Trigger</span>
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
                  recording={recording}
                  onRecord={() => {
                    setShortcutError(null);
                    setRecording(true);
                  }}
                  onClear={clearSelectedShortcut}
                  error={shortcutError}
                />
                {willDropCard && (
                  <div className="inline-warn" role="alert">
                    <AlertCircle className="warn-icon" aria-hidden="true" />
                    <span>A trigger has an empty or duplicated shortcut. It will be omitted on save.</span>
                  </div>
                )}
                <BlockKeyToggle
                  value={draftBlockKey}
                  onChange={setDraftBlockKey}
                />
              </section>

              <section className="inspector-section">
                <div className="section-head">
                  <span className="section-label">Automated Action</span>
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
                {single && (
                  <ActionEditor action={single} onChange={setSingleAction} />
                )}
              </section>
            </div>

            <div className="inspector-foot">
              <button
                type="button"
                className="btn-trigger-save"
                onClick={save}
                disabled={saving || !dirty}
                title={dirty ? "Save changes to profile" : "No changes to save"}
              >
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
