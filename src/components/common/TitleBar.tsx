import { useEffect, useState, type ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import appIcon from "../../assets/app-icon.png";

// Windows-style caption glyphs: 10x10 grid rendered at exactly 10px, so
// one unit maps to one pixel. All three glyphs share the same optical
// center; orthogonal strokes sit on half-pixel coordinates for crisp 1px
// edges, and diagonals get a slightly heavier stroke because a 1px diagonal
// only covers ~0.7px per pixel and reads thinner.
function MinimizeGlyph() {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true">
      <path d="M1 5.5h8" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function MaximizeGlyph() {
  return (
    <svg viewBox="0 0 10 10" aria-hidden="true">
      <rect
        x="1.5"
        y="1.5"
        width="7"
        height="7"
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
        d="M2.5 0.5h6v6M0.5 2.5h6v6H0.5z"
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
        strokeWidth="1.3"
      />
    </svg>
  );
}

export default function TitleBar({
  children,
}: {
  children?: ReactNode;
}) {
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
      {/* Centered independently of the two side clusters, so a wider title or
          a maximized window cannot shift it off-center. */}
      <div className="titlebar-center">{children}</div>
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
