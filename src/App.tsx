import { useState } from "react";
import { useTauriIpc } from "./hooks/useTauriIpc";
import { useProfileRunner } from "./hooks/useProfileRunner";
import { useProfileStore } from "./stores/useProfileStore";
import TitleBar from "./components/chrome/TitleBar";
import Navbar, { type NavView } from "./components/nav/Navbar";
import ProfileRail from "./components/profiles/ProfileRail";
import Workspace from "./components/workspace/Workspace";
import NumberStepper from "./components/workspace/actions/NumberStepper";
import "./theme.css";

function SettingsView() {
  const focusFallbackMs = useProfileStore((s) => s.focusFallbackMs);
  const setFocusFallbackMs = useProfileStore((s) => s.setFocusFallbackMs);

  return (
    <main className="workspace">
      <div className="flow-canvas">
        <div className="flow-inner">
          <div className="flow-head">
            <h3 className="flow-title">Settings</h3>
          </div>
          <div className="modal-field" style={{ maxWidth: 320 }}>
            <span className="modal-label">Focus fallback delay</span>
            <NumberStepper
              label="Delay before returning"
              unit="ms"
              value={focusFallbackMs}
              min={0}
              max={5000}
              step={50}
              onChange={setFocusFallbackMs}
            />
            <span className="scope-desc">
              When no profile matches the focused window, Macro Studio waits
              this long before returning to the profile you selected in the
              rail. Prevents flicker while switching windows.
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

function App() {
  useTauriIpc();
  const { activeRun, error } = useProfileRunner();
  const [view, setView] = useState<NavView>("profiles");

  return (
    <div className="app-shell">
      <TitleBar />
      {error && <div className="run-error">{error}</div>}
      <div className="app-body-row">
        <Navbar view={view} onView={setView} />
        <div className="app-content">
          {view === "profiles" ? (
            <>
              <ProfileRail activeRun={activeRun} />
              <Workspace />
            </>
          ) : (
            <SettingsView />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
