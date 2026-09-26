import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useProfileStore } from "../../stores/useProfileStore";
import type { Profile } from "../../types";

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

export default function Workspace() {
  const activeId = useProfileStore((s) => s.activeId);
  const profiles = useProfileStore((s) => s.profiles);
  const activeWindow = useProfileStore((s) => s.activeWindow);
  const active = profiles.find((p) => p.id === activeId) ?? null;

  const [draftTrigger, setDraftTrigger] = useState(active?.triggers[0] ?? "F9");
  const [draftTarget, setDraftTarget] = useState(active?.target_exe ?? "");
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exes, setExes] = useState<string[]>([]);

  const [triggerType, setTriggerType] = useState("Hotkey Press");
  const [triggerMode, setTriggerMode] = useState("Toggle ON/OFF");
  const [cooldown, setCooldown] = useState(250);
  const [blockKey, setBlockKey] = useState(true);
  const [repeatHeld, setRepeatHeld] = useState(false);

  useEffect(() => {
    setDraftTrigger(active?.triggers[0] ?? "F9");
    setDraftTarget(active?.target_exe ?? "");
    setRecording(false);
  }, [active?.id, active?.triggers, active?.target_exe]);

  useEffect(() => {
    invoke<string[]>("system_running_exes")
      .then(setExes)
      .catch(() => setExes([]));
  }, []);

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
        setDraftTrigger(t);
        setRecording(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [recording]);

  const exeOptions = [...exes];
  if (activeWindow && activeWindow !== "Unknown" && !exeOptions.some((e) => e.toLowerCase() === activeWindow.toLowerCase())) {
    exeOptions.push(activeWindow);
  }

  const chips = parseTrigger(draftTrigger);
  const dirty = active != null && (draftTrigger !== (active.triggers[0] ?? "F9") || (draftTarget || "") !== (active.target_exe ?? ""));

  async function save() {
    if (!active) return;
    const clean = draftTrigger.trim() || "F9";
    setSaving(true);
    try {
      const updated: Profile = { ...active, triggers: [clean], target_exe: draftTarget.trim() || null };
      await invoke("profile_save", { profile: updated });
      const list = await invoke<Profile[]>("profile_list");
      useProfileStore.getState().setProfiles(list);
      setDraftTrigger(clean);
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
              <h3 className="flow-title">Configured Triggers (1)</h3>
              <p className="flow-sub">Events and keyboard/mouse hooks that execute this macro sequence</p>
            </div>
            <span className="flow-profile" title={active.target_exe ?? "All windows"}>
              {active.name}
            </span>
          </div>

          <div
            className={`trigger-card ${recording ? "trigger-card-recording" : ""}`}
            onClick={() => setRecording(true)}
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
                  {recording ? (
                    <span className="trigger-recording-hint">Press keys… (Esc to cancel)</span>
                  ) : chips.length === 0 ? (
                    <span className="trigger-recording-hint">No shortcut set</span>
                  ) : (
                    chips.map((c, i) => (
                      <span key={`${c}-${i}`} className="kbd-row">
                        {i > 0 && <span className="kbd-plus">+</span>}
                        <kbd className={`kbd ${i === chips.length - 1 ? "kbd-last" : ""}`}>{c}</kbd>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <button type="button" className="trigger-add" onClick={() => setRecording(true)}>
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
                ) : chips.length === 0 ? (
                  <span className="trigger-recording-hint">No shortcut set</span>
                ) : (
                  chips.map((c, i) => (
                    <span key={`${c}-${i}`} className="kbd-row">
                      {i > 0 && <span className="kbd-plus">+</span>}
                      <kbd className={`kbd kbd-box ${i === chips.length - 1 ? "kbd-last" : ""}`}>{c}</kbd>
                    </span>
                  ))
                )}
              </div>
              <button type="button" className="clear-btn" onClick={() => setDraftTrigger("")} title="Clear Hotkey">
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
                aria-checked={blockKey}
                className={`switch ${blockKey ? "switch-on" : ""}`}
                onClick={() => setBlockKey((v) => !v)}
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
          <button type="button" className="btn-trigger-delete" onClick={() => setDraftTrigger("")} title="Remove Trigger">
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
