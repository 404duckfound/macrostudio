import { Layers, Settings } from "lucide-react";

export type NavView = "profiles" | "settings";

export default function Navbar({
  view,
  onView,
}: {
  view: NavView;
  onView: (v: NavView) => void;
}) {
  return (
    <nav className="navbar" aria-label="Main">
      <div className="navbar-items">
        <button
          type="button"
          className={`navbar-btn ${view === "profiles" ? "active" : ""}`}
          aria-current={view === "profiles" ? "page" : undefined}
          title="Profiles"
          onClick={() => onView("profiles")}
        >
          <Layers aria-hidden="true" />
          <span>Profiles</span>
        </button>
        <button
          type="button"
          className={`navbar-btn ${view === "settings" ? "active" : ""}`}
          aria-current={view === "settings" ? "page" : undefined}
          title="Settings"
          onClick={() => onView("settings")}
        >
          <Settings aria-hidden="true" />
          <span>Settings</span>
        </button>
      </div>
    </nav>
  );
}
