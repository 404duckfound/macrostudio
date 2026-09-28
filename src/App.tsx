import { useState } from "react";
import { useTauriIpc } from "./hooks/useTauriIpc";
import { useProfileRunner } from "./hooks/useProfileRunner";
import TitleBar from "./components/chrome/TitleBar";
import Navbar, { type NavView } from "./components/nav/Navbar";
import ProfileRail from "./components/profiles/ProfileRail";
import Workspace from "./components/workspace/Workspace";
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
              <Workspace />
            </>
          ) : (
            <main className="workspace">
              <div className="flow-empty">
                <span>Settings</span>
                <span>Nothing here yet.</span>
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
