import { Cpu, FolderOpen, Info, Monitor, RotateCcw } from "lucide-react";
import { useProfileStore } from "../../stores/useProfileStore";
import NumberStepper from "../workspace/actions/NumberStepper";

export default function SettingsView() {
  const focusFallbackMs = useProfileStore((s) => s.focusFallbackMs);
  const setFocusFallbackMs = useProfileStore((s) => s.setFocusFallbackMs);

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
