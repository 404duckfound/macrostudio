import { useState } from "react";
import { useTauriIpc } from "./hooks/useTauriIpc";
import { useProfileRunner } from "./hooks/useProfileRunner";
import TitleBar from "./components/common/TitleBar";
import Navbar, { type NavView } from "./components/common/Navbar";
import ProfileRail from "./components/profiles/ProfileRail";
import Workspace from "./components/workspace/Workspace";
import MacrosView from "./components/macros/MacrosView";
import SettingsView from "./components/settings/SettingsView";
import "./theme.css";

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
              <Workspace activeRun={activeRun} />
            </>
          ) : view === "macros" ? (
            <MacrosView />
          ) : (
            <SettingsView />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
