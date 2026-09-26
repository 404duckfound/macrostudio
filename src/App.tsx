import { useState } from "react";
import { useTauriIpc } from "./hooks/useTauriIpc";
import TitleBar from "./components/chrome/TitleBar";
import Navbar, { type NavView } from "./components/nav/Navbar";
import ProfileRail from "./components/profiles/ProfileRail";
import Workspace from "./components/workspace/Workspace";
import "./theme.css";

function App() {
  useTauriIpc();
  const [view, setView] = useState<NavView>("profiles");

  return (
    <div className="app-shell">
      <TitleBar />
      <div className="app-body-row">
        <Navbar view={view} onView={setView} />
        <div className="app-content">
          {view === "profiles" ? (
            <>
              <ProfileRail />
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
