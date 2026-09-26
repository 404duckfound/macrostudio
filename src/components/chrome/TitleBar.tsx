import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";
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
          <Minus aria-hidden="true" />
        </button>
        <button
          type="button"
          className="titlebar-btn"
          aria-label={maximized ? "Restore" : "Maximize"}
          title={maximized ? "Restore" : "Maximize"}
          onClick={toggleMaximize}
        >
          {maximized ? (
            <Copy aria-hidden="true" />
          ) : (
            <Square aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className="titlebar-btn close"
          aria-label="Close"
          title="Close"
          onClick={close}
        >
          <X aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
