import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import appIcon from "../../assets/app-icon.png";

// Windows-style caption glyphs: 10x10 grid, 1px stroke, sharp corners.
// Lucide's Minus/Square/X render at mismatched visual weights; these stay
// consistent with each other at any size.
function MinimizeGlyph() {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true">
      <path d="M1 8.5h8" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function MaximizeGlyph() {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true">
      <rect
        x="1"
        y="1"
        width="8"
        height="8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

function RestoreGlyph() {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M3 0.5h6v6M1 2.5h6v6H1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true">
      <path
        d="M1 1l8 8M9 1l-8 8"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

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
          <MinimizeGlyph />
        </button>
        <button
          type="button"
          className="titlebar-btn"
          aria-label={maximized ? "Restore" : "Maximize"}
          title={maximized ? "Restore" : "Maximize"}
          onClick={toggleMaximize}
        >
          {maximized ? <RestoreGlyph /> : <MaximizeGlyph />}
        </button>
        <button
          type="button"
          className="titlebar-btn close"
          aria-label="Close"
          title="Close"
          onClick={close}
        >
          <CloseGlyph />
        </button>
      </div>
    </header>
  );
}
