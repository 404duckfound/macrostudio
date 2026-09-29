import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Ban, Eye, Keyboard, Plus, Save, Trash2, Undo2 } from "lucide-react";
import { useProfileStore } from "../../stores/useProfileStore";
import { useKeyCapture } from "../../hooks/useKeyCapture";
import { parseTrigger } from "../../lib/keys";
import type { ActionBlock, MacroAction, Profile, Trigger } from "../../types";
import ActionTypeCard from "./ActionTypeCard";
import BlockKeyToggle from "./BlockKeyToggle";
import Chips from "./Chips";
import KeyActionEditor from "./KeyActionEditor";
import ShortcutField from "./ShortcutField";

const BLOCK_LABELS: Record<ActionBlock["kind"], string> = {
  keys: "Keys",
  mouse: "Mouse",
  delay: "Delay",
};

const KEY_PRESETS = [
  "Enter",
  "Tab",
  "Escape",
  "Space",
  "Backspace",
  "Delete",
  "Up",
  "Down",
  "Left",
  "Right",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "F10",
  "F11",
  "F12",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
];

const MOUSE_BUTTONS = ["Left", "Right", "Middle"];

/// Bos shortcut'i ve yinelenen kaydi kirpar; sonuc profilde saklanan haliyle
/// birebir ayni olmali, yoksa `dirty` her zaman true doner.
function cleanDraft(drafts: Trigger[]): Trigger[] {
  const seen = new Set<string>();
  const out: Trigger[] = [];
  for (const t of drafts) {
    const shortcut = t.shortcut.trim();
    if (!shortcut || seen.has(shortcut)) continue;
    seen.add(shortcut);
    out.push({ shortcut, actions: t.actions });
  }
  return out;
}

function KeysInput({
  keys,
  onKeys,
}: {
  keys: string;
  onKeys: (keys: string) => void;
}) {
  const [mode, setMode] = useState<"preset" | "custom">(
    KEY_PRESETS.includes(keys) || keys === "" ? "preset" : "custom",
  );
  return (
    <>
      <select
        value={mode}
        aria-label="Keys input mode"
        onChange={(e) => {
          const next = e.target.value as "preset" | "custom";
          setMode(next);
          onKeys(next === "preset" ? keys || "Enter" : "");
        }}
      >
        <option value="preset">Pick key</option>
        <option value="custom">Type keys</option>
      </select>
      {mode === "preset" ? (
        <select
          value={KEY_PRESETS.includes(keys) ? keys : ""}
          aria-label="Key"
          onChange={(e) => onKeys(e.target.value)}
        >
          {keys !== "" && !KEY_PRESETS.includes(keys) && (
            <option value={keys}>{keys}</option>
          )}
          {KEY_PRESETS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="action-input"
          value={keys}
          placeholder="Keys to send"
          onChange={(e) => onKeys(e.target.value)}
        />
      )}
    </>
  );
}

function MouseInput({
  button,
  x,
  y,
  onPatch,
}: {
  button: string;
  x: number;
  y: number;
  onPatch: (patch: { button?: string; x?: number; y?: number }) => void;
}) {
  const [useCoords, setUseCoords] = useState(x !== 0 || y !== 0);
  return (
    <div className="action-grid">
      <select
        value={button}
        aria-label="Mouse button"
        onChange={(e) => onPatch({ button: e.target.value })}
      >
        {MOUSE_BUTTONS.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <label
        className="coord-toggle"
        title="Use fixed coordinates instead of current pointer"
      >
        <input
          type="checkbox"
          checked={useCoords}
          onChange={(e) => {
            setUseCoords(e.target.checked);
            onPatch({ x: 0, y: 0 });
          }}
        />
        <span>X/Y</span>
      </label>
      {useCoords && (
        <>
          <input
            type="number"
            value={x}
            aria-label="Click X"
            onChange={(e) => onPatch({ x: Number(e.target.value) || 0 })}
          />
          <input
            type="number"
            value={y}
            aria-label="Click Y"
            onChange={(e) => onPatch({ y: Number(e.target.value) || 0 })}
          />
        </>
      )}
    </div>
  );
}

function BlockRow({
  block,
  onChange,
  onDelete,
}: {
  block: ActionBlock;
  onChange: (b: ActionBlock) => void;
  onDelete: () => void;
}) {
  return (
    <div className="block-row">
      <span className="block-kind">{BLOCK_LABELS[block.kind]}</span>
      {block.kind === "keys" && (
        <KeysInput
          keys={block.keys}
          onKeys={(keys) => onChange({ kind: "keys", keys })}
        />
      )}
      {block.kind === "delay" && (
        <input
          type="number"
          min={0}
          value={block.ms}
          aria-label="Delay milliseconds"
          onChange={(e) =>
            onChange({ kind: "delay", ms: Number(e.target.value) || 0 })
          }
        />
      )}
      {block.kind === "mouse" && (
        <MouseInput
          button={block.button}
          x={block.x}
          y={block.y}
          onPatch={(patch) => onChange({ ...block, ...patch })}
        />
      )}
      <button
        type="button"
        className="action-delete"
        onClick={onDelete}
        title="Delete block"
      >
        ×
      </button>
    </div>
  );
}

function ActionEditor({
  action,
  onChange,
}: {
  action: MacroAction;
  onChange: (a: MacroAction) => void;
}) {
  function addBlock(kind: ActionBlock["kind"]) {
    if (action.type !== "custom") return;
    let fresh: ActionBlock;
    switch (kind) {
      case "keys":
        fresh = { kind: "keys", keys: "" };
        break;
      case "mouse":
        fresh = { kind: "mouse", button: "Left", x: 0, y: 0 };
        break;
      case "delay":
        fresh = { kind: "delay", ms: 500 };
        break;
    }
    onChange({ type: "custom", blocks: [...action.blocks, fresh] });
  }

  function updateBlock(i: number, next: ActionBlock) {
    if (action.type !== "custom") return;
    onChange({
      type: "custom",
      blocks: action.blocks.map((b, j) => (j === i ? next : b)),
    });
  }

  function deleteBlock(i: number) {
    if (action.type !== "custom") return;
    onChange({
      type: "custom",
      blocks: action.blocks.filter((_, j) => j !== i),
    });
  }

  return (
    <div className="action-card">
      {action.type === "key" && (
        <KeyActionEditor action={action} onChange={onChange} />
      )}
      {action.type === "keys" && (
        <KeysInput
          keys={action.keys}
          onKeys={(keys) => onChange({ type: "keys", keys })}
        />
      )}
      {action.type === "mouse" && (
        <MouseInput
          button={action.button}
          x={action.x}
          y={action.y}
          onPatch={(patch) => onChange({ ...action, ...patch })}
        />
      )}
      {action.type === "script" && (
        <textarea
          className="action-textarea"
          value={action.code}
          placeholder={'Raw AHK v2, e.g.\nSend("hello")'}
          spellCheck={false}
          onChange={(e) => onChange({ type: "script", code: e.target.value })}
        />
      )}
      {action.type === "custom" && (
        <>
          {action.blocks.map((b, i) => (
            <BlockRow
              key={i}
              block={b}
              onChange={(next) => updateBlock(i, next)}
              onDelete={() => deleteBlock(i)}
            />
          ))}
          <div className="block-add-row">
            <button type="button" onClick={() => addBlock("keys")}>
              + Keys
            </button>
            <button type="button" onClick={() => addBlock("mouse")}>
              + Mouse
            </button>
            <button type="button" onClick={() => addBlock("delay")}>
              + Delay
            </button>
          </div>
        </>
      )}
    </div>
  );
}

interface UndoEntry {
  triggers: Trigger[];
  block_key: boolean;
}

export default function Workspace() {
  const activeId = useProfileStore((s) => s.activeId);
  const profiles = useProfileStore((s) => s.profiles);
  const active = profiles.find((p) => p.id === activeId) ?? null;

  const [draftTriggers, setDraftTriggers] = useState<Trigger[]>(
    active?.triggers ?? [],
  );
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [draftBlockKey, setDraftBlockKey] = useState(active?.block_key ?? false);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  // Son kayittan onceki kayitli hal. Tek adim: geri alindiktan sonra gecer.
  const [undo, setUndo] = useState<UndoEntry | null>(null);

  useEffect(() => {
    setDraftTriggers(
      active?.triggers.length
        ? active.triggers.map((t) => ({
            shortcut: t.shortcut,
            actions: t.actions
              .slice(0, 1)
              .map((a) =>
                a.type === "custom"
                  ? { type: "custom", blocks: a.blocks.map((b) => ({ ...b })) }
                  : { ...a },
              ),
          }))
        : [],
    );
    setSelectedIdx(0);
    setDraftBlockKey(active?.block_key ?? false);
    setRecording(false);
  }, [active?.id, active?.triggers, active?.block_key]);

  // Gecmis profille eslesmesin; yeni profilde undo eski kaydi geri getirirdi.
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
  const cleanTriggers = useMemo(() => cleanDraft(draftTriggers), [draftTriggers]);
  // Bos shortcut'li ya da yinelenen bir kart varsa kayit oncesi kaybolacak;
  // inspector'da gorunur bir uyari veriyoruz.
  const hasDroppableCard = cleanTriggers.length !== draftTriggers.length;
  const dirty =
    active != null &&
    (JSON.stringify(cleanTriggers) !== JSON.stringify(active.triggers) ||
      draftBlockKey !== active.block_key);

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
    setDraftTriggers((prev) =>
      prev.map((x, i) =>
        i === sel ? { ...x, actions: next ? [next] : [] } : x,
      ),
    );
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
        fresh = { type: "key", key: "", behavior: "tap", pre_delay_ms: 0, repeat: 1 };
        break;
    }
    setSingleAction(fresh);
  }

  /// `next` verilmezse inspector'daki (kirpilmis) taslak yazilir. Yazma
  /// basarili olmadan cikis yapmaz; gecmis ancak o zaman yazilir, boylece
  /// geri alma butonu hicbir zaman kaybolmus bir kaydi gostermez.
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
                    onClick={() =>
                      setDraftTriggers((prev) =>
                        prev.map((x, i) =>
                          i === sel ? { ...x, shortcut: "" } : x,
                        ),
                      )
                    }
                  >
                    Clear
                  </button>
                )}
              </div>
              <ShortcutField
                parts={selectedChips}
                recording={recording}
                onRecord={() => setRecording(true)}
                onClear={() =>
                  setDraftTriggers((prev) =>
                    prev.map((x, i) => (i === sel ? { ...x, shortcut: "" } : x)),
                  )
                }
              />
              {hasDroppableCard && (
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
              className="btn-trigger-delete"
              onClick={removeSelected}
              disabled={!selected}
              title="Remove Trigger"
              aria-label="Remove Trigger"
            >
              <Trash2 aria-hidden="true" />
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
              className="btn-trigger-save"
              onClick={save}
              disabled={saving || !dirty}
              title={dirty ? "Save Changes" : "No changes to save"}
            >
              <Save aria-hidden="true" />
              <span>Save</span>
            </button>
          </div>
        </aside>
      )}
    </main>
  );
}
