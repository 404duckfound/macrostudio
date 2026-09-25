import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import appIcon from "../../assets/app-icon.png";

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const win = getCurrentWindow();
        setMaximized(await win.isMaximized());
        unlisten = await win.onResized(async () => {
          try {
            setMaximized(await getCurrentWindow().isMaximized());
          } catch {
            /* browser preview: ignore */
          }
        });
      } catch {
        /* browser preview (pnpm dev): no Tauri runtime */
      }
    })();
    return () => unlisten?.();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.maximized = maximized ? "true" : "false";
  }, [maximized]);

  async function minimize() {
    try {
      await getCurrentWindow().minimize();
    } catch {
      /* ignore in browser */
    }
  }

  async function toggleMaximize() {
    try {
      await getCurrentWindow().toggleMaximize();
      setMaximized(await getCurrentWindow().isMaximized());
    } catch {
      /* ignore in browser */
    }
  }

  async function close() {
    try {
      await getCurrentWindow().close();
    } catch {
      /* ignore in browser */
    }
  }

  return (
    <header
      className="titlebar"
      data-tauri-drag-region
      onDoubleClick={toggleMaximize}
    >
      <div className="titlebar-left" data-tauri-drag-region>
        <img
          src={appIcon}
          alt=""
          width={20}
          height={20}
          className="titlebar-logo"
          draggable={false}
          data-tauri-drag-region
        />
        <span className="titlebar-title" data-tauri-drag-region>
          Macro Studio
        </span>
      </div>
      <div
        className="titlebar-controls"
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="titlebar-btn"
          aria-label="Minimize"
          title="Minimize"
          onClick={minimize}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          className="titlebar-btn"
          aria-label={maximized ? "Restore" : "Maximize"}
          title={maximized ? "Restore" : "Maximize"}
          onClick={toggleMaximize}
        >
          {maximized ? (
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <rect x="3.5" y="1.5" width="7" height="7" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
              <path d="M1.5 3.5v6a1 1 0 0 0 1 1h6" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          ) : (
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <rect x="2" y="2" width="8" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="titlebar-btn close"
          aria-label="Close"
          title="Close"
          onClick={close}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
