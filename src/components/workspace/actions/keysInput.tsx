import { useState } from "react";

const COMMON_KEYS = [
  "Enter",
  "Tab",
  "Space",
  "Escape",
  "Backspace",
  "Delete",
  "Up",
  "Down",
  "Left",
  "Right",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "F10",
  "F11",
  "F12",
];

export function KeysInput({
  keys,
  onKeys,
}: {
  keys: string;
  onKeys: (keys: string) => void;
}) {
  const isPreset = COMMON_KEYS.includes(keys);
  const [mode, setMode] = useState<"preset" | "custom">(
    isPreset || keys === "" ? "preset" : "custom",
  );

  return (
    <div className="keys-input-wrap">
      <div className="keys-mode-bar">
        <button
          type="button"
          className={`keys-mode-btn ${mode === "preset" ? "active" : ""}`}
          onClick={() => {
            setMode("preset");
            if (!COMMON_KEYS.includes(keys)) {
              onKeys(keys || "Enter");
            }
          }}
        >
          Preset Key
        </button>
        <button
          type="button"
          className={`keys-mode-btn ${mode === "custom" ? "active" : ""}`}
          onClick={() => setMode("custom")}
        >
          Custom Text
        </button>
      </div>

      {mode === "preset" ? (
        <div className="custom-select-wrap">
          <select
            className="custom-select"
            value={COMMON_KEYS.includes(keys) ? keys : "Enter"}
            aria-label="Preset key selection"
            onChange={(e) => onKeys(e.target.value)}
          >
            {COMMON_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="keys-custom-box">
          <input
            className="action-input"
            value={keys}
            placeholder="Type text or keys to send..."
            aria-label="Keys to send"
            onChange={(e) => onKeys(e.target.value)}
          />
          <div className="keys-quick-tokens">
            <span className="keys-tokens-label">Insert:</span>
            {["{Enter}", "{Tab}", "{Space}", "{Esc}"].map((token) => (
              <button
                key={token}
                type="button"
                className="keys-token-btn"
                onClick={() => onKeys(`${keys}${token}`)}
              >
                +{token}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
