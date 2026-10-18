import type { ReactNode } from "react";
import { Boxes, Layers, Settings } from "lucide-react";

export type NavView = "profiles" | "macros" | "settings";

interface NavItem {
  view: NavView;
  label: string;
  icon: ReactNode;
}

const ITEMS: NavItem[] = [
  { view: "profiles", label: "Profiles", icon: <Layers aria-hidden="true" /> },
  { view: "macros", label: "Macros", icon: <Boxes aria-hidden="true" /> },
  { view: "settings", label: "Settings", icon: <Settings aria-hidden="true" /> },
];

export default function Navbar({
  view,
  onView,
}: {
  view: NavView;
  onView: (v: NavView) => void;
}) {
  return (
    <nav className="navbar" aria-label="Main">
      {ITEMS.map((item) => (
        <button
          key={item.view}
          type="button"
          className={`navbar-btn ${view === item.view ? "active" : ""}`}
          aria-current={view === item.view ? "page" : undefined}
          title={item.label}
          onClick={() => onView(item.view)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}