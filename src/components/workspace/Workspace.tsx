import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Ban, Eye, Keyboard, Plus, Save, Trash2, Undo2 } from "lucide-react";
import { useProfileStore } from "../../stores/useProfileStore";
import { useKeyCapture } from "../../hooks/useKeyCapture";
import { parseTrigger } from "../../lib/keys";
import type { MacroAction, Profile, Trigger } from "../../types";
import ActionEditor from "./actions/ActionEditor";
import ActionTypeCard from "./actions/ActionTypeCard";
import BlockKeyToggle from "./BlockKeyToggle";
import Chips from "./Chips";
import ShortcutField from "./ShortcutField";
import { cleanDraft, toDrafts, type UndoEntry } from "./triggerDraft";

export default function Workspace() {
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
  const [undo, setUndo] = useState<UndoEntry | null>(null);

  useEffect(() => {
    setDraftTriggers(toDrafts(active?.triggers));
    setSelectedIdx(0);
    setDraftBlockKey(active?.block_key ?? false);
    setRecording(false);
  }, [active?.id, active?.triggers, active?.block_key]);

  useEffect(() => setUndo(null), [active?.id]);

  const sel = Math.min(selectedIdx, Math.max(0, draftTriggers.length - 1));
  const selected = draftTriggers[sel] ?? null;

  const captureShortcut = useCallback(
    (combo: string) => {
      setDraftTriggers((prev) =>
        prev.map((x, i) => (i === sel ? { ...x, shortcut: combo } : x)),
      );
      setRecording(false);
    },
    [sel],
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

  async function persist(next: UndoEntry) {
    if (!active) return;
    setSaving(true);
    try {
      const updated: Profile = {
        ...active,
        triggers: next.triggers,
        block_key: next.block_key,
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
    const before = { triggers: active.triggers, block_key: active.block_key };
    await persist({ triggers: cleanTriggers, block_key: draftBlockKey });
    setUndo(before);
  }

  async function undoLastSave() {
    if (!undo) return;
    await persist(undo);
    setUndo(null);
  }

  if (!active) {
    return (
      <main className="workspace">
        <div className="flow-canvas">
          <div className="flow-empty">No profile selected.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="workspace">
      <div className="flow-canvas">
        <div className="flow-inner">
          <div className="flow-head">
            <h3 className="flow-title">Triggers ({cleanTriggers.length})</h3>
          </div>

          {draftTriggers.map((t, i) => (
            <div
              key={`${i}-${t.shortcut}`}
              className={`trigger-card ${i === sel ? "trigger-card-selected" : ""} ${recording && i === sel ? "trigger-card-recording" : ""}`}
              onClick={() => {
                setSelectedIdx(i);
                setRecording(false);
              }}
              title="Click to select"
            >
              <div className="trigger-card-left">
                <div className="trigger-icon">
                  <Keyboard aria-hidden="true" />
                </div>
                <div className="trigger-chips">
                  {recording && i === sel ? (
                    <span className="trigger-recording-hint">
                      Press a key… (Esc to cancel)
                    </span>
                  ) : (
                    <Chips parts={parseTrigger(t.shortcut)} />
                  )}
                </div>
              </div>
              <span
                className={`trigger-pass ${draftBlockKey ? "trigger-pass-block" : ""}`}
                title={
                  draftBlockKey
                    ? "Original keypress is blocked"
                    : "Original keypress passes through (~)"
                }
              >
                {draftBlockKey ? (
                  <Ban aria-hidden="true" />
                ) : (
                  <Eye aria-hidden="true" />
                )}
              </span>
            </div>
          ))}

          <button
            type="button"
            className="trigger-add-placeholder"
            onClick={addTrigger}
          >
            <Plus aria-hidden="true" />
            <span>Add trigger</span>
          </button>
        </div>
      </div>

      {selected && (
        <aside className="inspector">
          <div className="inspector-head">
            <div className="inspector-head-left">
              <h3>Trigger Inspector</h3>
            </div>
          </div>

          <div className="inspector-body">
            <section className="inspector-section">
              <div className="section-head">
                <span className="section-label">Shortcut</span>
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
                onRecord={() => setRecording(true)}
                onClear={clearSelectedShortcut}
              />
              {willDropCard && (
                <div className="inline-warn">
                  A card has no shortcut or a duplicate one. It will be dropped
                  on save.
                </div>
              )}
              <BlockKeyToggle
                value={draftBlockKey}
                onChange={setDraftBlockKey}
              />
            </section>

            <section className="inspector-section">
              <div className="section-head">
                <span className="section-label">Action</span>
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
                  Pick a key target, otherwise this trigger does nothing.
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
              title={dirty ? "Save Changes" : "No changes to save"}
            >
              <Save aria-hidden="true" />
              <span>Save</span>
            </button>
            <button
              type="button"
              className="btn-trigger-undo"
              onClick={undoLastSave}
              disabled={!undo || saving}
              title={
                undo
                  ? "Undo last save"
                  : "Nothing saved in this session to undo"
              }
              aria-label="Undo last save"
            >
              <Undo2 aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn-trigger-delete"
              onClick={removeSelected}
              disabled={!selected}
              title="Remove Trigger"
              aria-label="Remove Trigger"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </aside>
      )}
    </main>
  );
}
