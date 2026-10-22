import { useState } from "react";
import { useTauriIpc } from "./hooks/useTauriIpc";
import { useProfileRunner } from "./hooks/useProfileRunner";
import TitleBar from "./components/common/chrome/TitleBar";
import Navbar, { type NavView } from "./components/common/chrome/Navbar";
import ProfilesView from "./components/profiles/ProfilesView";
import MacrosView from "./components/macros/MacrosView";
import SettingsView from "./components/settings/SettingsView";
import "./theme.css";

function App() {
  useTauriIpc();
  const { activeRun, error } = useProfileRunner();
  const [view, setView] = useState<NavView>("profiles");

  return (
    <div className="app-shell">
      <TitleBar>
        <Navbar view={view} onView={setView} />
      </TitleBar>
      <div className="app-body-row">
        <div className="app-content">
          {view === "profiles" ? (
            <ProfilesView activeRun={activeRun} runError={error} />
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
