import { open } from "@tauri-apps/plugin-dialog";
import { Crosshair, FolderOpen } from "lucide-react";

interface ProfileScopeFieldProps {
  targetExe: string;
  onTargetExe: (v: string) => void;
  exeOptions: string[];
  activeWindow: string;
  browsePath: string;
  onBrowsePath: (v: string) => void;
}

function basename(path: string): string {
  const parts = path.replace(/\//g, "\\").split("\\");
  return parts[parts.length - 1] ?? path;
}

export default function ProfileScopeField({
  targetExe,
  onTargetExe,
  exeOptions,
  activeWindow,
  browsePath,
  onBrowsePath,
}: ProfileScopeFieldProps) {
  const hasActive = activeWindow !== "" && activeWindow !== "Unknown";
  const specific = targetExe !== "";

  async function browseExe() {
    try {
      const picked = await open({
        multiple: false,
        filters: [{ name: "Executable", extensions: ["exe"] }],
      });
      if (typeof picked === "string" && picked) {
        onBrowsePath(picked);
        onTargetExe(basename(picked));
      }
    } catch {}
  }

  function clearTarget() {
    onTargetExe("");
    onBrowsePath("");
  }

  function useActiveWindow() {
    if (hasActive) {
      onTargetExe(activeWindow);
      onBrowsePath("");
    }
  }

  return (
    <div className="modal-field">
      <span className="modal-label">
        Which window should this profile apply to?
      </span>
      <button
        type="button"
        className={`scope-card ${!specific ? "scope-card-active" : ""}`}
        onClick={clearTarget}
      >
        <span
          className={`scope-radio ${!specific ? "scope-radio-on" : ""}`}
          aria-hidden="true"
        />
        <span className="scope-text">
          <span className="scope-title-row">
            <span className="scope-title">All windows</span>
            <span className="scope-badge">Global</span>
          </span>
          <span className="scope-desc">
            Available across all active applications without filter.
          </span>
        </span>
      </button>
      <button
        type="button"
        className={`scope-card ${specific ? "scope-card-active" : ""}`}
        onClick={() => {
          if (!specific)
            onTargetExe(hasActive ? activeWindow : (exeOptions[0] ?? ""));
        }}
      >
        <span
          className={`scope-radio ${specific ? "scope-radio-on" : ""}`}
          aria-hidden="true"
        />
        <span className="scope-text">
          <span className="scope-title-row">
            <span className="scope-title">Only a specific application</span>
            {specific && (
              <span className="scope-badge scope-badge-linked">Linked</span>
            )}
          </span>
          <span className="scope-desc">
            Activates automatically when the selected process is active.
          </span>
        </span>
      </button>
      {specific && (
        <div className="scope-card scope-card-active scope-detail">
          <div className="exe-row">
            <select
              value={targetExe}
              onChange={(e) => {
                onTargetExe(e.target.value);
                onBrowsePath("");
              }}
              aria-label="Target application"
            >
              {exeOptions.length === 0 && (
                <option value="">No open windows found</option>
              )}
              {exeOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <button
              className="btn-secondary exe-btn"
              type="button"
              title="Set active window as target"
              onClick={useActiveWindow}
              disabled={!hasActive}
            >
              <Crosshair className="exe-btn-icon" aria-hidden="true" /> Detect
            </button>
            <button
              className="btn-secondary exe-btn"
              type="button"
              title="Browse for executable"
              onClick={browseExe}
            >
              <FolderOpen className="exe-btn-icon" aria-hidden="true" /> Browse
            </button>
          </div>
          <div className="exe-path" title={browsePath || targetExe}>
            {browsePath || targetExe}
          </div>
        </div>
      )}
    </div>
  );
}
