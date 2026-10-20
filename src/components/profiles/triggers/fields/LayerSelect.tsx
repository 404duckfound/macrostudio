import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Layers } from "lucide-react";
import type { Layer } from "../../../../types";

/**
 * Picks the layer a trigger belongs to. While the layer's activator key is
 * held, the layer's triggers take over from the normal ones.
 */
export default function LayerSelect({
  value,
  layers,
  onChange,
}: {
  /** The layer id of the trigger; null for the normal layer. */
  value: string | null;
  layers: Layer[];
  onChange: (layerId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = layers.find((l) => l.id === value) ?? null;

  return (
    <div className="layer-select" ref={rootRef}>
      <button
        type="button"
        className={`layer-select-btn ${current ? "layer-select-btn-set" : ""} ${open ? "layer-select-btn-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select layer"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="layer-select-icon" aria-hidden="true">
          <Layers />
        </span>
        <span className="layer-select-name">
          {current ? current.name : "No layer"}
        </span>
        {current && (
          <span className="layer-select-activator">{current.activator}</span>
        )}
        <span className="layer-select-chevron" aria-hidden="true">
          {open ? <ChevronUp /> : <ChevronDown />}
        </span>
      </button>
      {open && (
        <div className="layer-select-pop" role="listbox" aria-label="Layers">
          <button
            type="button"
            role="option"
            aria-selected={!value}
            className={`layer-select-option ${!value ? "layer-select-option-active" : ""}`}
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            <span className="layer-select-name">No layer</span>
            {!value && (
              <span className="layer-select-check" aria-hidden="true">
                <Check />
              </span>
            )}
          </button>
          {layers.map((layer) => (
            <button
              key={layer.id}
              type="button"
              role="option"
              aria-selected={layer.id === value}
              className={`layer-select-option ${layer.id === value ? "layer-select-option-active" : ""}`}
              onClick={() => {
                onChange(layer.id);
                setOpen(false);
              }}
            >
              <span className="layer-select-name">{layer.name}</span>
              <span className="layer-select-activator">{layer.activator}</span>
              {layer.id === value && (
                <span className="layer-select-check" aria-hidden="true">
                  <Check />
                </span>
              )}
            </button>
          ))}
          {layers.length === 0 && (
            <div className="layer-select-empty">
              No layers yet. Add one in the profile settings.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
