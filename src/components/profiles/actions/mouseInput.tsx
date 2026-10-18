import { useState } from "react";
import { MousePointer } from "lucide-react";

const MOUSE_BUTTONS = ["Left", "Right", "Middle"] as const;

export function MouseInput({
  button,
  x,
  y,
  onPatch,
}: {
  button: string;
  x: number;
  y: number;
  onPatch: (patch: { button?: string; x?: number; y?: number }) => void;
}) {
  const [useCoords, setUseCoords] = useState(x !== 0 || y !== 0);

  return (
    <div className="mouse-input-wrap">
      <div className="mouse-button-row">
        <span className="mouse-field-label">Button</span>
        <div className="mouse-segmented" role="radiogroup" aria-label="Mouse button">
          {MOUSE_BUTTONS.map((b) => (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={button === b}
              className={`mouse-seg-btn ${button === b ? "active" : ""}`}
              onClick={() => onPatch({ button: b })}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="mouse-coord-section">
        <label className="mouse-coord-toggle">
          <input
            type="checkbox"
            className="custom-checkbox"
            checked={useCoords}
            onChange={(e) => {
              const checked = e.target.checked;
              setUseCoords(checked);
              onPatch({ x: 0, y: 0 });
            }}
          />
          <span className="mouse-coord-toggle-text">Specify fixed coordinates</span>
        </label>

        {useCoords ? (
          <div className="mouse-coord-inputs">
            <div className="mouse-coord-col">
              <span className="mouse-coord-label">X Position</span>
              <div className="mouse-coord-field">
                <span className="mouse-coord-prefix">X</span>
                <input
                  type="number"
                  className="mouse-coord-input"
                  value={x}
                  placeholder="0"
                  aria-label="Click X position"
                  autoComplete="off"
                  onChange={(e) => onPatch({ x: Number(e.target.value) || 0 })}
                />
                <span className="mouse-coord-unit">px</span>
              </div>
            </div>
            <div className="mouse-coord-col">
              <span className="mouse-coord-label">Y Position</span>
              <div className="mouse-coord-field">
                <span className="mouse-coord-prefix">Y</span>
                <input
                  type="number"
                  className="mouse-coord-input"
                  value={y}
                  placeholder="0"
                  aria-label="Click Y position"
                  autoComplete="off"
                  onChange={(e) => onPatch({ y: Number(e.target.value) || 0 })}
                />
                <span className="mouse-coord-unit">px</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mouse-hint-row">
            <MousePointer className="mouse-hint-icon" aria-hidden="true" />
            <span>Clicks at current cursor position</span>
          </div>
        )}
      </div>
    </div>
  );
}
