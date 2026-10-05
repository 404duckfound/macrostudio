import { useState } from "react";
import { Cpu, FolderOpen, Info, Monitor, Plus, RotateCcw, X } from "lucide-react";
import { useProfileStore } from "../../stores/useProfileStore";
import NumberStepper from "../workspace/actions/NumberStepper";

export default function SettingsView() {
  const focusFallbackMs = useProfileStore((s) => s.focusFallbackMs);
  const setFocusFallbackMs = useProfileStore((s) => s.setFocusFallbackMs);
  const ignoredExes = useProfileStore((s) => s.ignoredExes);
  const addIgnoredExe = useProfileStore((s) => s.addIgnoredExe);
  const removeIgnoredExe = useProfileStore((s) => s.removeIgnoredExe);
  const [draft, setDraft] = useState("");

  function addDraft() {
    if (!draft.trim()) return;
    addIgnoredExe(draft);
    setDraft("");
  }

  return (
    <main className="workspace settings-workspace">
      <div className="flow-canvas">
        <div className="settings-container">
          <div className="settings-header">
            <h2 className="settings-title">Settings</h2>
            <p className="settings-subtitle">
              Configure automation preferences, window focus handling, and engine runtime.
            </p>
          </div>

          <div className="settings-section-card">
            <div className="settings-section-head">
              <div className="settings-section-icon">
                <Monitor aria-hidden="true" />
              </div>
              <div className="settings-section-info">
                <h3>Window Matching & Focus</h3>
                <p>Configure how Macro Studio tracks active applications</p>
              </div>
            </div>

            <div className="settings-setting-row">
              <div className="settings-setting-text">
                <span className="settings-setting-name">Focus fallback delay</span>
                <span className="settings-setting-desc">
                  When switching windows or moving between unfocused tasks, Macro Studio waits this long before reverting to your manual profile selection. Helps prevent flickering during rapid Alt+Tab switches.
                </span>
              </div>
              <div className="settings-setting-control">
                <NumberStepper
                  label="Delay"
                  unit="ms"
                  value={focusFallbackMs}
                  min={0}
                  max={5000}
                  step={50}
                  onChange={setFocusFallbackMs}
                />
                <button
                  type="button"
                  className="btn-ghost settings-reset-btn"
                  onClick={() => setFocusFallbackMs(100)}
                  title="Reset to default 100ms"
                >
                  <RotateCcw className="btn-icon-sm" aria-hidden="true" />
                  <span>Reset to 100ms</span>
                </button>
              </div>
            </div>

            <div className="settings-setting-row">
              <div className="settings-setting-text">
                <span className="settings-setting-name">Ignored windows</span>
                <span className="settings-setting-desc">
                  These windows never trigger an automatic profile switch. The current profile stays active while one of them is focused.
                </span>
              </div>
            </div>
            <div className="settings-ignore-add">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addDraft();
                }}
                placeholder="osk.exe"
                aria-label="Executable to ignore"
              />
              <button
                type="button"
                className="btn-secondary settings-ignore-btn"
                onClick={addDraft}
                disabled={!draft.trim()}
              >
                <Plus className="btn-icon-sm" aria-hidden="true" />
                <span>Add</span>
              </button>
            </div>
            {ignoredExes.length === 0 ? (
              <p className="settings-setting-desc">No ignored windows.</p>
            ) : (
              <ul className="settings-ignore-list">
                {ignoredExes.map((exe) => (
                  <li key={exe.toLowerCase()} className="settings-ignore-item">
                    <span className="settings-path-text">{exe}</span>
                    <button
                      type="button"
                      className="btn-ghost settings-ignore-remove"
                      onClick={() => removeIgnoredExe(exe)}
                      title={`Stop ignoring ${exe}`}
                      aria-label={`Stop ignoring ${exe}`}
                    >
                      <X className="btn-icon-sm" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="settings-section-card">
            <div className="settings-section-head">
              <div className="settings-section-icon">
                <Cpu aria-hidden="true" />
              </div>
              <div className="settings-section-info">
                <h3>Automation Engine</h3>
                <p>AutoHotkey v2 backend process and execution details</p>
              </div>
            </div>

            <div className="settings-info-grid">
              <div className="settings-info-item">
                <span className="settings-info-label">Runtime Engine</span>
                <span className="settings-info-val">AutoHotkey v2.0 (64-bit Bundled)</span>
              </div>
              <div className="settings-info-item">
                <span className="settings-info-label">Window Behavior</span>
                <span className="settings-info-val">Close button hides to system tray</span>
              </div>
              <div className="settings-info-item full-width">
                <span className="settings-info-label">Profile Storage Directory</span>
                <div className="settings-path-box">
                  <FolderOpen className="settings-path-icon" aria-hidden="true" />
                  <span className="settings-path-text">%APPDATA%\macro-studio\profiles</span>
                </div>
              </div>
            </div>
          </div>

          <div className="settings-section-card">
            <div className="settings-section-head">
              <div className="settings-section-icon">
                <Info aria-hidden="true" />
              </div>
              <div className="settings-section-info">
                <h3>About Macro Studio</h3>
                <p>Version specifications and architecture</p>
              </div>
            </div>

            <div className="settings-about-row">
              <div className="settings-about-meta">
                <span className="settings-app-name">Macro Studio Dark Engine</span>
                <span className="settings-app-build">Version 0.1.0 • Windows x64 Native Desktop</span>
              </div>
              <span className="settings-badge-pill">Tauri v2 + React 19</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
