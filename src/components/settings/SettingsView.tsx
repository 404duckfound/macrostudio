import { useEffect, useRef, useState } from "react";
import { Cpu, FolderOpen, Info, Monitor, Plus, RotateCcw, X } from "lucide-react";
import {
  DEFAULT_FOCUS_FALLBACK_MS,
  useProfileStore,
} from "../../stores/useProfileStore";
import NumberStepper from "../common/ui/NumberStepper";

export default function SettingsView() {
  const focusFallbackMs = useProfileStore((s) => s.focusFallbackMs);
  const setFocusFallbackMs = useProfileStore((s) => s.setFocusFallbackMs);
  const ignoredExes = useProfileStore((s) => s.ignoredExes);
  const addIgnoredExe = useProfileStore((s) => s.addIgnoredExe);
  const removeIgnoredExe = useProfileStore((s) => s.removeIgnoredExe);
  const [draft, setDraft] = useState("");
  // Rows mid-fade-out: the store drops them 150ms later, so the exit animation
  // has time to play instead of the row vanishing between two frames.
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const fadeTimers = useRef<number[]>([]);

  useEffect(
    () => () => {
      fadeTimers.current.forEach((id) => window.clearTimeout(id));
    },
    [],
  );

  function addDraft() {
    if (!draft.trim()) return;
    addIgnoredExe(draft);
    setDraft("");
  }

  function removeIgnored(exe: string) {
    if (removing.has(exe)) return;
    setRemoving((prev) => new Set(prev).add(exe));
    const id = window.setTimeout(() => {
      removeIgnoredExe(exe);
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(exe);
        return next;
      });
    }, 150);
    fadeTimers.current.push(id);
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
                  onClick={() => setFocusFallbackMs(DEFAULT_FOCUS_FALLBACK_MS)}
                  title={`Reset to default ${DEFAULT_FOCUS_FALLBACK_MS}ms`}
                >
                  <RotateCcw className="btn-icon-sm" aria-hidden="true" />
                  <span>Reset to {DEFAULT_FOCUS_FALLBACK_MS}ms</span>
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
                autoComplete="off"
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
              <div className="settings-empty-hint">
                <span>No ignored windows.</span>
              </div>
            ) : (
              <ul className="settings-ignore-list">
                {ignoredExes.map((exe) => (
                  <li
                    key={exe.toLowerCase()}
                    className={`settings-ignore-item ${
                      removing.has(exe) ? "settings-ignore-item-out" : ""
                    }`}
                  >
                    <span className="settings-path-text">{exe}</span>
                    <button
                      type="button"
                      className="btn-ghost settings-ignore-remove"
                      onClick={() => removeIgnored(exe)}
                      disabled={removing.has(exe)}
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
                <span className="settings-app-name">Macro Studio</span>
                <span className="settings-app-build">Version 0.1.0 · Windows x64</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
