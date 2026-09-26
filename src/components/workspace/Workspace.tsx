import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useProfileStore } from "../../stores/useProfileStore";
import type { ActionBlock, MacroAction, Profile, Trigger } from "../../types";

function parseTrigger(trigger: string): string[] {
  return trigger
    .split("+")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function keyEventToTrigger(e: KeyboardEvent): string | null {
  if (e.key === "Escape") return null;
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  if (e.metaKey) parts.push("Meta");
  let key = e.key;
  if (key === " ") key = "Space";
  else if (key.length === 1) key = key.toUpperCase();
  else key = key.charAt(0).toUpperCase() + key.slice(1);
  parts.push(key);
  return parts.join("+");
}

function mouseEventToTrigger(e: MouseEvent): string | null {
  const btn =
    e.button === 0
      ? "MouseLeft"
      : e.button === 1
        ? "MouseMiddle"
        : e.button === 2
          ? "MouseRight"
          : e.button === 3
            ? "MouseX1"
            : e.button === 4
              ? "MouseX2"
              : null;
  if (!btn) return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  if (e.metaKey) parts.push("Meta");
  parts.push(btn);
  return parts.join("+");
}

function Chips({ parts, box }: { parts: string[]; box: boolean }) {
  if (parts.length === 0) return <span className="trigger-recording-hint">No shortcut set</span>;
  return (
    <>
      {parts.map((c, i) => (
        <span key={`${c}-${i}`} className="kbd-row">
          {i > 0 && <span className="kbd-plus">+</span>}
          <kbd className={`kbd ${box ? "kbd-box" : ""} ${i === parts.length - 1 ? "kbd-last" : ""}`}>{c}</kbd>
        </span>
      ))}
    </>
  );
}

const BLOCK_LABELS: Record<ActionBlock["kind"], string> = {
  keys: "Keys",
  mouse: "Mouse",
  delay: "Delay",
};

const KEY_PRESETS = [
  "Enter", "Tab", "Escape", "Space", "Backspace", "Delete",
  "Up", "Down", "Left", "Right", "Home", "End", "PageUp", "PageDown",
  "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
  "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
  "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
];

const MOUSE_BUTTONS = ["Left", "Right", "Middle"];

function KeysInput({
  block,
  onChange,
}: {
  block: { kind: "keys"; keys: string };
  onChange: (b: ActionBlock) => void;
}) {
  const [mode, setMode] = useState<"preset" | "custom">(
    KEY_PRESETS.includes(block.keys) || block.keys === "" ? "preset" : "custom",
  );
  return (
    <>
      <select
        value={mode}
        aria-label="Keys input mode"
        onChange={(e) => {
          const next = e.target.value as "preset" | "custom";
          setMode(next);
          onChange({ kind: "keys", keys: next === "preset" ? block.keys || "Enter" : "" });
        }}
      >
        <option value="preset">Pick key</option>
        <option value="custom">Type keys</option>
      </select>
      {mode === "preset" ? (
        <select
          value={KEY_PRESETS.includes(block.keys) ? block.keys : ""}
          aria-label="Key"
          onChange={(e) => onChange({ kind: "keys", keys: e.target.value })}
        >
          {block.keys !== "" && !KEY_PRESETS.includes(block.keys) && (
            <option value={block.keys}>{block.keys}</option>
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
          value={block.keys}
          placeholder="Keys to send"
          onChange={(e) => onChange({ kind: "keys", keys: e.target.value })}
        />
      )}
    </>
  );
}

function MouseInput({
  block,
  onChange,
}: {
  block: { kind: "mouse"; button: string; x: number; y: number };
  onChange: (b: ActionBlock) => void;
}) {
  const [useCoords, setUseCoords] = useState(block.x !== 0 || block.y !== 0);
  return (
    <div className="action-grid">
      <select
        value={block.button}
        aria-label="Mouse button"
        onChange={(e) => onChange({ ...block, button: e.target.value })}
      >
        {MOUSE_BUTTONS.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <label className="coord-toggle" title="Use fixed coordinates instead of current pointer">
        <input
          type="checkbox"
          checked={useCoords}
          onChange={(e) => {
            setUseCoords(e.target.checked);
            onChange({ ...block, x: 0, y: 0 });
          }}
        />
        <span>X/Y</span>
      </label>
      {useCoords && (
        <>
          <input
            type="number"
            value={block.x}
            aria-label="Click X"
            onChange={(e) => onChange({ ...block, x: Number(e.target.value) || 0 })}
          />
          <input
            type="number"
            value={block.y}
            aria-label="Click Y"
            onChange={(e) => onChange({ ...block, y: Number(e.target.value) || 0 })}
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
      {block.kind === "keys" && <KeysInput block={block} onChange={onChange} />}
      {block.kind === "delay" && (
        <input
          type="number"
          min={0}
          value={block.ms}
          aria-label="Delay milliseconds"
          onChange={(e) => onChange({ kind: "delay", ms: Number(e.target.value) || 0 })}
        />
      )}
      {block.kind === "mouse" && <MouseInput block={block} onChange={onChange} />}
      <button type="button" className="action-delete" onClick={onDelete} title="Delete block">
        ×
      </button>
    </div>
  );
}

function ActionCard({
  action,
  onChange,
  onDelete,
}: {
  action: MacroAction;
  onChange: (a: MacroAction) => void;
  onDelete: () => void;
}) {
  function addBlock(kind: ActionBlock["kind"]) {
    if (action.type !== "custom") return;
    const fresh: ActionBlock =
      kind === "keys"
        ? { kind: "keys", keys: "" }
        : kind === "mouse"
          ? { kind: "mouse", button: "Left", x: 0, y: 0 }
          : { kind: "delay", ms: 500 };
    onChange({ type: "custom", blocks: [...action.blocks, fresh] });
  }

  function updateBlock(i: number, next: ActionBlock) {
    if (action.type !== "custom") return;
    onChange({ type: "custom", blocks: action.blocks.map((b, j) => (j === i ? next : b)) });
  }

  function deleteBlock(i: number) {
    if (action.type !== "custom") return;
    onChange({ type: "custom", blocks: action.blocks.filter((_, j) => j !== i) });
  }

  return (
    <div className="action-card">
      <div className="action-card-head">
        <span className="action-kind">{action.type === "custom" ? "Custom" : "Script"}</span>
        <button type="button" className="action-delete" onClick={onDelete} title="Delete action">
          Delete
        </button>
      </div>
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
            <button type="button" onClick={() => addBlock("keys")}>+ Keys</button>
            <button type="button" onClick={() => addBlock("mouse")}>+ Mouse</button>
            <button type="button" onClick={() => addBlock("delay")}>+ Delay</button>
          </div>
        </>
      )}
    </div>
  );
}

type AddKind = "keys-press" | "mouse-press" | "custom" | "script";

export default function Workspace() {
  const activeId = useProfileStore((s) => s.activeId);
  const profiles = useProfileStore((s) => s.profiles);
  const active = profiles.find((p) => p.id === activeId) ?? null;

  const [draftTriggers, setDraftTriggers] = useState<Trigger[]>(
    active?.triggers ?? [{ shortcut: "F9", actions: [] }],
  );
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [draftBlockKey, setDraftBlockKey] = useState(active?.block_key ?? true);
  const [addKind, setAddKind] = useState<AddKind>("keys-press");
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftTriggers(
      active?.triggers.length
        ? active.triggers.map((t) => ({
            shortcut: t.shortcut,
            actions: t.actions.map((a) =>
              a.type === "custom"
                ? { type: "custom", blocks: a.blocks.map((b) => ({ ...b })) }
                : { ...a },
            ),
          }))
        : [],
    );
    setSelectedIdx(0);
    setDraftBlockKey(active?.block_key ?? true);
    setRecording(false);
  }, [active?.id, active?.triggers, active?.block_key]);

  const sel = Math.min(selectedIdx, Math.max(0, draftTriggers.length - 1));
  const selected = draftTriggers[sel] ?? null;

  useEffect(() => {
    if (!recording) return;
    function onKey(e: KeyboardEvent) {
      e.preventDefault();
      if (e.key === "Escape") {
        setRecording(false);
        return;
      }
      const t = keyEventToTrigger(e);
      if (t) {
        setDraftTriggers((prev) => prev.map((x, i) => (i === sel ? { ...x, shortcut: t } : x)));
        setRecording(false);
      }
    }
    function onMouse(e: MouseEvent) {
      e.preventDefault();
      const t = mouseEventToTrigger(e);
      if (t) {
        setDraftTriggers((prev) => prev.map((x, i) => (i === sel ? { ...x, shortcut: t } : x)));
        setRecording(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouse);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [recording, sel]);

  const selectedChips = parseTrigger(selected?.shortcut ?? "");
  const dirty =
    active != null &&
    (JSON.stringify(draftTriggers) !== JSON.stringify(active.triggers) ||
      draftBlockKey !== active.block_key);

  function addTrigger() {
    const pending = draftTriggers.findIndex((t) => t.shortcut.trim().length === 0);
    if (pending >= 0) {
      setSelectedIdx(pending);
      return;
    }
    setDraftTriggers((prev) => [...prev, { shortcut: "F9", actions: [] }]);
    setSelectedIdx(draftTriggers.length);
  }

  function removeSelected() {
    setDraftTriggers((prev) => prev.filter((_, i) => i !== sel));
    setSelectedIdx(Math.max(0, sel - 1));
    setRecording(false);
  }

  function updateSelectedActions(next: MacroAction[]) {
    setDraftTriggers((prev) => prev.map((x, i) => (i === sel ? { ...x, actions: next } : x)));
  }

  function addAction() {
    if (!selected) return;
    const fresh: MacroAction =
      addKind === "keys-press"
        ? { type: "custom", blocks: [{ kind: "keys", keys: "" }] }
        : addKind === "mouse-press"
          ? { type: "custom", blocks: [{ kind: "mouse", button: "Left", x: 0, y: 0 }] }
          : addKind === "custom"
            ? { type: "custom", blocks: [] }
            : { type: "script", code: "" };
    updateSelectedActions([...selected.actions, fresh]);
  }

  async function save() {
    if (!active) return;
    const seen = new Set<string>();
    const cleanTriggers: Trigger[] = [];
    for (const t of draftTriggers) {
      const shortcut = t.shortcut.trim();
      if (!shortcut || seen.has(shortcut)) continue;
      seen.add(shortcut);
      cleanTriggers.push({ shortcut, actions: t.actions });
    }
    setSaving(true);
    try {
      const updated: Profile = {
        ...active,
        triggers: cleanTriggers,
        block_key: draftBlockKey,
      };
      await invoke("profile_save", { profile: updated });
      const list = await invoke<Profile[]>("profile_list");
      useProfileStore.getState().setProfiles(list);
    } finally {
      setSaving(false);
    }
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
            <div>
              <h3 className="flow-title">Configured Triggers ({draftTriggers.length})</h3>
              <p className="flow-sub">Events and keyboard/mouse hooks that execute this macro sequence</p>
            </div>
            <div className="flow-head-actions">
              <span className="flow-profile" title={active.target_exe ?? "All windows"}>
                {active.name}
              </span>
              <button
                type="button"
                className="btn-trigger-delete"
                onClick={removeSelected}
                disabled={!selected}
                title="Remove Trigger"
              >
                Sil
              </button>
              <button type="button" className="btn-trigger-save" onClick={save} disabled={saving || !dirty} title="Save Changes">
                {saving ? "Saving…" : "Kaydet"}
              </button>
            </div>
          </div>

          {draftTriggers.length === 0 && <div className="flow-empty">No triggers yet.</div>}
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
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <path
                      d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="trigger-chips">
                  {recording && i === sel ? (
                    <span className="trigger-recording-hint">Press a key or click… (Esc to cancel)</span>
                  ) : (
                    <Chips parts={parseTrigger(t.shortcut)} box={false} />
                  )}
                </div>
              </div>
            </div>
          ))}

          <button type="button" className="trigger-add" onClick={addTrigger}>
            <span aria-hidden="true">+</span>
            <span>Add New Trigger</span>
          </button>
        </div>
      </div>

      <aside className="inspector">
        <div className="inspector-head">
          <div className="inspector-head-left">
            <span className="inspector-dot" />
            <h3>Trigger Inspector</h3>
          </div>
        </div>

        <div className="inspector-body">
          <div className="field">
            <div className="field-row">
              <label>Shortcut</label>
              <button type="button" className="link-btn" onClick={() => setRecording(true)}>
                {recording ? "Recording…" : "Record Key"}
              </button>
            </div>
            <div className={`shortcut-box ${recording ? "shortcut-box-recording" : ""}`}>
              <div className="trigger-chips">
                {recording ? (
                  <span className="trigger-recording-hint">Press a key or click in this window…</span>
                ) : (
                  <Chips parts={selectedChips} box />
                )}
              </div>
              <button
                type="button"
                className="clear-btn"
                onClick={() =>
                  setDraftTriggers((prev) => prev.map((x, i) => (i === sel ? { ...x, shortcut: "" } : x)))
                }
                title="Clear Hotkey"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="toggles">
            <div className="toggle-row">
              <div>
                <span className="toggle-title">Block Original Keypress</span>
                <span className="toggle-sub">Suppress OS key event pass-through</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draftBlockKey}
                className={`switch ${draftBlockKey ? "switch-on" : ""}`}
                onClick={() => setDraftBlockKey((v) => !v)}
              >
                <span className="switch-thumb" />
              </button>
            </div>
          </div>

          <div className="field">
            <div className="field-row">
              <label>
                Actions ({selected?.actions.length ?? 0}
                {selected?.shortcut ? ` — ${selected.shortcut}` : ""})
              </label>
            </div>
            {(selected?.actions ?? []).map((a, i) => (
              <ActionCard
                key={i}
                action={a}
                onChange={(next) =>
                  selected &&
                  updateSelectedActions(selected.actions.map((x, j) => (j === i ? next : x)))
                }
                onDelete={() =>
                  selected && updateSelectedActions(selected.actions.filter((_, j) => j !== i))
                }
              />
            ))}
            <div className="action-add-controls">
              <select value={addKind} onChange={(e) => setAddKind(e.target.value as AddKind)} aria-label="Action type">
                <option value="keys-press">Keyboard Press</option>
                <option value="mouse-press">Mouse Press</option>
                <option value="custom">Custom</option>
                <option value="script">Script</option>
              </select>
              <button type="button" className="btn-secondary action-add-btn" onClick={addAction} disabled={!selected}>
                Add
              </button>
            </div>
          </div>
        </div>
      </aside>
    </main>
  );
}
