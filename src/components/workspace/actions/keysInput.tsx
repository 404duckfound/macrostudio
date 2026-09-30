import { useState } from "react";

const KEY_PRESETS = [
  "Enter",
  "Tab",
  "Escape",
  "Space",
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
  ..."abcdefghijklmnopqrstuvwxyz",
];

export function KeysInput({
  keys,
  onKeys,
}: {
  keys: string;
  onKeys: (keys: string) => void;
}) {
  const [mode, setMode] = useState<"preset" | "custom">(
    KEY_PRESETS.includes(keys) || keys === "" ? "preset" : "custom",
  );
  return (
    <>
      <select
        value={mode}
        aria-label="Keys input mode"
        onChange={(e) => {
          const next = e.target.value as "preset" | "custom";
          setMode(next);
          onKeys(next === "preset" ? keys || "Enter" : "");
        }}
      >
        <option value="preset">Pick key</option>
        <option value="custom">Type keys</option>
      </select>
      {mode === "preset" ? (
        <select
          value={KEY_PRESETS.includes(keys) ? keys : ""}
          aria-label="Key"
          onChange={(e) => onKeys(e.target.value)}
        >
          {keys !== "" && !KEY_PRESETS.includes(keys) && (
            <option value={keys}>{keys}</option>
          )}
          {KEY_PRESETS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="action-input"
          value={keys}
          placeholder="Keys to send"
          onChange={(e) => onKeys(e.target.value)}
        />
      )}
    </>
  );
}
