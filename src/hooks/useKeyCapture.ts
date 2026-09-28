import { useEffect } from "react";
import { keyEventToTrigger, mouseEventToTrigger } from "../lib/keys";

export function useKeyCapture(
  active: boolean,
  onCapture: (combo: string) => void,
  onCancel: () => void,
  preserveCase = false,
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
  }, [active, onCapture, onCancel, preserveCase]);
}
