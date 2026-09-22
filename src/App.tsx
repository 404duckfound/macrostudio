import { useTauriIpc } from "./hooks/useTauriIpc";
import TitleBar from "./components/chrome/TitleBar";
import Navbar from "./components/nav/Navbar";
import ProfileRail from "./components/profiles/ProfileRail";
import "./theme.css";

function App() {
  useTauriIpc();

  return (
    <div className="app-shell">
      <TitleBar />
      <div className="app-body-row">
        <Navbar />
        <div className="app-content">
          <ProfileRail />
        </div>
      </div>
    </div>
  );
}

export default App;
