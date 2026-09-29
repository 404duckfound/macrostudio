import { useState } from "react";

const MOUSE_BUTTONS = ["Left", "Right", "Middle"];

/// X/Y kutusu yalnizca acikca secildiginde gorunur; kapatmak koordinatlari
/// sifirlar, boylece "imleci nereye tiklayayim" modundan sabit koordinat
/// moduna gecis yanlis bir degerle baslamaz.
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
    <div className="action-grid">
      <select
        value={button}
        aria-label="Mouse button"
        onChange={(e) => onPatch({ button: e.target.value })}
      >
        {MOUSE_BUTTONS.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <label
        className="coord-toggle"
        title="Use fixed coordinates instead of current pointer"
      >
        <input
          type="checkbox"
          checked={useCoords}
          onChange={(e) => {
            setUseCoords(e.target.checked);
            onPatch({ x: 0, y: 0 });
          }}
        />
        <span>X/Y</span>
      </label>
      {useCoords && (
        <>
          <input
            type="number"
            value={x}
            aria-label="Click X"
            onChange={(e) => onPatch({ x: Number(e.target.value) || 0 })}
          />
          <input
            type="number"
            value={y}
            aria-label="Click Y"
            onChange={(e) => onPatch({ y: Number(e.target.value) || 0 })}
          />
        </>
      )}
    </div>
  );
}
