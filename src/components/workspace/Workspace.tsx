import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useProfileStore } from "../../stores/useProfileStore";
import type { MacroAction, Profile } from "../../types";

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

const ACTION_LABELS: Record<MacroAction["type"], string> = {
  send_keys: "Send Keys",
  delay: "Delay",
  mouse_click: "Mouse Click",
  custom: "Custom AHK",
};

function ActionCard({
  action,
  onChange,
  onDelete,
}: {
  action: MacroAction;
  onChange: (a: MacroAction) => void;
  onDelete: () => void;
}) {
  return (
    <div className="action-card">
      <div className="action-card-head">
        <span className="action-kind">{ACTION_LABELS[action.type]}</span>
        <button type="button" className="action-delete" onClick={onDelete} title="Delete action">
          Delete
        </button>
      </div>
      {action.type === "send_keys" && (
        <input
          className="action-input"
          value={action.payload}
          placeholder="Text to type"
          onChange={(e) => onChange({ type: "send_keys", payload: e.target.value })}
        />
      )}
      {action.type === "delay" && (
        <input
          type="number"
          min={0}
          value={action.ms}
          aria-label="Delay milliseconds"
          onChange={(e) => onChange({ type: "delay", ms: Number(e.target.value) || 0 })}
        />
      )}
      {action.type === "mouse_click" && (
        <div className="action-grid">
          <select
            value={action.button}
            aria-label="Mouse button"
            onChange={(e) => onChange({ ...action, button: e.target.value })}
          >
            <option value="Left">Left</option>
            <option value="Right">Right</option>
            <option value="Middle">Middle</option>
          </select>
          <input
            type="number"
            value={action.x}
            aria-label="Click X"
            onChange={(e) => onChange({ ...action, x: Number(e.target.value) || 0 })}
          />
          <input
            type="number"
            value={action.y}
            aria-label="Click Y"
            onChange={(e) => onChange({ ...action, y: Number(e.target.value) || 0 })}
          />
        </div>
      )}
      {action.type === "custom" && (
        <textarea
          className="action-textarea"
          value={action.code}
          placeholder={'Raw AHK v2, e.g.\nSend("hello")'}
          spellCheck={false}
          onChange={(e) => onChange({ type: "custom", code: e.target.value })}
        />
      )}
    </div>
  );
}

export default function Workspace() {
  const activeId = useProfileStore((s) => s.activeId);
  const profiles = useProfileStore((s) => s.profiles);
  const activeWindow = useProfileStore((s) => s.activeWindow);
  const active = profiles.find((p) => p.id === activeId) ?? null;

  const [draftTriggers, setDraftTriggers] = useState<string[]>(active?.triggers ?? ["F9"]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [draftActions, setDraftActions] = useState<MacroAction[]>(active?.actions ?? []);
  const [draftTarget, setDraftTarget] = useState(active?.target_exe ?? "");
  const [draftBlockKey, setDraftBlockKey] = useState(active?.block_key ?? true);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exes, setExes] = useState<string[]>([]);

  const [triggerType, setTriggerType] = useState("Hotkey Press");
  const [triggerMode, setTriggerMode] = useState("Toggle ON/OFF");
  const [cooldown, setCooldown] = useState(250);
  const [repeatHeld, setRepeatHeld] = useState(false);

  useEffect(() => {
    setDraftTriggers(active?.triggers.length ? [...active.triggers] : []);
    setSelectedIdx(0);
    setDraftActions(active?.actions ? [...active.actions] : []);
    setDraftTarget(active?.target_exe ?? "");
    setDraftBlockKey(active?.block_key ?? true);
    setRecording(false);
  }, [active?.id, active?.triggers, active?.actions, active?.target_exe, active?.block_key]);

  useEffect(() => {
    invoke<string[]>("system_running_exes")
      .then(setExes)
      .catch(() => setExes([]));
  }, []);

  const sel = Math.min(selectedIdx, Math.max(0, draftTriggers.length - 1));

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
        setDraftTriggers((prev) => prev.map((x, i) => (i === sel ? t : x)));
        setRecording(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [recording, sel]);

  const exeOptions = [...exes];
  if (activeWindow && activeWindow !== "Unknown" && !exeOptions.some((e) => e.toLowerCase() === activeWindow.toLowerCase())) {
    exeOptions.push(activeWindow);
  }

  const selectedChips = parseTrigger(draftTriggers[sel] ?? "");
  const dirty =
    active != null &&
    (JSON.stringify(draftTriggers) !== JSON.stringify(active.triggers) ||
      JSON.stringify(draftActions) !== JSON.stringify(active.actions) ||
      (draftTarget || "") !== (active.target_exe ?? "") ||
      draftBlockKey !== active.block_key);

  function addTrigger() {
    setDraftTriggers((prev) => [...prev, "F9"]);
    setSelectedIdx(draftTriggers.length);
    setRecording(true);
  }

  function removeSelected() {
    setDraftTriggers((prev) => prev.filter((_, i) => i !== sel));
    setSelectedIdx(Math.max(0, sel - 1));
    setRecording(false);
  }

  function addAction(type: MacroAction["type"]) {
    const fresh: MacroAction =
      type === "send_keys"
        ? { type: "send_keys", payload: "" }
        : type === "delay"
          ? { type: "delay", ms: 500 }
          : type === "mouse_click"
            ? { type: "mouse_click", button: "Left", x: 0, y: 0 }
            : { type: "custom", code: "" };
    setDraftActions((prev) => [...prev, fresh]);
  }

  async function save() {
    if (!active) return;
    const cleanTriggers = draftTriggers.map((t) => t.trim()).filter((t) => t.length > 0);
    setSaving(true);
    try {
      const updated: Profile = {
        ...active,
        triggers: cleanTriggers,
        target_exe: draftTarget.trim() || null,
        block_key: draftBlockKey,
        actions: draftActions,
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
            <span className="flow-profile" title={active.target_exe ?? "All windows"}>
              {active.name}
            </span>
          </div>

          {draftTriggers.length === 0 && (
            <div className="flow-empty">No triggers yet — add one below.</div>
          )}
          {draftTriggers.map((t, i) => (
            <div
              key={`${i}-${t}`}
              className={`trigger-card ${i === sel ? "trigger-card-selected" : ""} ${recording && i === sel ? "trigger-card-recording" : ""}`}
              onClick={() => {
                setSelectedIdx(i);
                setRecording(true);
              }}
              title="Click to record a new shortcut"
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
                <div>
                  <span className="trigger-name">Hotkey Activation</span>
                  <div className="trigger-chips">
                    {recording && i === sel ? (
                      <span className="trigger-recording-hint">Press keys… (Esc to cancel)</span>
                    ) : (
                      <Chips parts={parseTrigger(t)} box={false} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button type="button" className="trigger-add" onClick={addTrigger}>
            <span aria-hidden="true">+</span>
            <span>Add New Trigger</span>
          </button>

          <div className="flow-head flow-actions-head">
            <div>
              <h3 className="flow-title">Actions ({draftActions.length})</h3>
              <p className="flow-sub">What runs when any trigger fires, in order</p>
            </div>
          </div>
          {draftActions.map((a, i) => (
            <ActionCard
              key={i}
              action={a}
              onChange={(next) => setDraftActions((prev) => prev.map((x, j) => (j === i ? next : x)))}
              onDelete={() => setDraftActions((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
          <div className="action-add-row">
            <button type="button" onClick={() => addAction("send_keys")}>+ Text</button>
            <button type="button" onClick={() => addAction("delay")}>+ Delay</button>
            <button type="button" onClick={() => addAction("mouse_click")}>+ Click</button>
            <button type="button" onClick={() => addAction("custom")}>+ Custom</button>
          </div>
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
            <label>Trigger Type</label>
            <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)}>
              <option>Hotkey Press</option>
              <option>Mouse Button Click</option>
              <option>Window Focus / Event</option>
              <option>Application Launch</option>
            </select>
          </div>

          <div className="field">
            <div className="field-row">
              <label>Assigned Shortcut</label>
              <button type="button" className="link-btn" onClick={() => setRecording(true)}>
                {recording ? "Recording…" : "Record Key"}
              </button>
            </div>
            <div className={`shortcut-box ${recording ? "shortcut-box-recording" : ""}`}>
              <div className="trigger-chips">
                {recording ? (
                  <span className="trigger-recording-hint">Press keys…</span>
                ) : (
                  <Chips parts={selectedChips} box />
                )}
              </div>
              <button
                type="button"
                className="clear-btn"
                onClick={() => setDraftTriggers((prev) => prev.map((x, i) => (i === sel ? "" : x)))}
                title="Clear Hotkey"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="field">
            <label>Trigger Mode</label>
            <select value={triggerMode} onChange={(e) => setTriggerMode(e.target.value)}>
              <option>Toggle ON/OFF</option>
              <option>Hold Down / While Pressed</option>
              <option>Single Fire / Execute Once</option>
            </select>
          </div>

          <div className="field">
            <label>Trigger Cooldown</label>
            <div className="cooldown-wrap">
              <input
                type="number"
                min={0}
                value={cooldown}
                onChange={(e) => setCooldown(Number(e.target.value))}
              />
              <span className="cooldown-unit">ms</span>
            </div>
          </div>

          <div className="field">
            <label>Target Application</label>
            <div className="exe-row">
              <select value={draftTarget} onChange={(e) => setDraftTarget(e.target.value)} aria-label="Target exe">
                <option value="">No target (all windows)</option>
                {exeOptions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
              <button
                className="btn-secondary exe-capture"
                type="button"
                title="Set active window as target"
                onClick={() => setDraftTarget(activeWindow)}
                disabled={!activeWindow || activeWindow === "Unknown"}
              >
                Active window
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
            <div className="toggle-row">
              <div>
                <span className="toggle-title">Repeat While Held</span>
                <span className="toggle-sub">Loop execution continuously</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={repeatHeld}
                className={`switch ${repeatHeld ? "switch-on" : ""}`}
                onClick={() => setRepeatHeld((v) => !v)}
              >
                <span className="switch-thumb" />
              </button>
            </div>
          </div>
        </div>

        <div className="inspector-foot">
          <button type="button" className="btn-trigger-delete" onClick={removeSelected} title="Remove Trigger">
            Sil
          </button>
          <button type="button" className="btn-trigger-save" onClick={save} disabled={saving || !dirty} title="Save Changes">
            {saving ? "Saving…" : "Kaydet"}
          </button>
        </div>
      </aside>
    </main>
  );
}
