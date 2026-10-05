import { useEffect } from "react";
import { keyEventToTrigger, mouseEventToTrigger } from "../lib/keys";

interface KeyCaptureOptions {
  preserveCase?: boolean;
  // Stops the left button being picked as a trigger: with block_key on, a
  // MouseLeft trigger emits `LButton::`, which swallows the click, so mouse
  // clicks would vanish entirely.
  ignoreLeftClick?: boolean;
}

export function useKeyCapture(
  active: boolean,
  onCapture: (combo: string) => void,
  onCancel: () => void,
  { preserveCase = false, ignoreLeftClick = false }: KeyCaptureOptions = {},
) {
  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      e.preventDefault();
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      const combo = keyEventToTrigger(e, preserveCase);
      if (combo) onCapture(combo);
    }
    function onMouse(e: MouseEvent) {
      if (ignoreLeftClick && e.button === 0) return;
      e.preventDefault();
      const combo = mouseEventToTrigger(e);
      if (combo) onCapture(combo);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouse);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onMouse);
    };
  }, [active, onCapture, onCancel, preserveCase, ignoreLeftClick]);
}
