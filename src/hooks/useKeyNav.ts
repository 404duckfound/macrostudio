import { useEffect, useRef } from "react";
import { keyEventToTrigger } from "../lib/keys";
import { splitCombo } from "../lib/keyCatalog";
import { isKeyCapturing } from "./useKeyCapture";

/**
 * Chords the webview and the window own. Macro triggers may legitimately be
 * "Ctrl+C" or "Ctrl+S", so only the chords that would reload the window,
 * open devtools or close it stay out of the map.
 *
 * Ctrl+W is deliberately absent. WebView2 keeps Close Tab / Close Window
 * (Ctrl+W, Ctrl+F4, Ctrl+Shift+W) and F11 turned off unless the app handles
 * NewWindowRequested (Microsoft's WebView2 browser-features page, "Shortcuts
 * turned off except when event not handled"), so Ctrl+W never closes this
 * window. Reserving it only made a user's Ctrl+W trigger unreachable by a
 * physical press, which is the bug this list must not create.
 */
const RESERVED = new Set([
  "Ctrl+R",
  "Ctrl+Shift+R",
  "Ctrl+Shift+I",
  "Ctrl+Shift+J",
  "Ctrl+Shift+C",
  "F5",
  "F11",
  "F12",
]);

/**
 * Keys that must keep their normal meaning: Space and Enter activate a
 * focused control, Tab moves focus, Backspace deletes, CapsLock toggles.
 * A trigger on them is still reachable from the map.
 */
const NOT_NAVIGABLE = new Set([
  "Space",
  "Enter",
  "Backspace",
  "Tab",
  "CapsLock",
  "Delete",
  "Insert",
  "Escape",
]);

function isNavigableMain(main: string): boolean {
  if (NOT_NAVIGABLE.has(main)) return false;
  return main.length === 1 || /^F\d{1,2}$/.test(main);
}

/**
 * Reports physical key presses while `active`.
 *
 * This is navigation, not capture: it never takes a key away from a text
 * field, a running key recording, or an open dialog.
 */
export function useKeyNav(
  active: boolean,
  onNav: (combo: string, altGr: boolean) => void,
) {
  const cb = useRef(onNav);
  cb.current = onNav;

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.repeat) return;
      // The Windows key belongs to the OS, not to a macro.
      if (e.metaKey) return;
      // Alt opens menus and closes windows with F4.
      if (e.altKey && !e.getModifierState?.("AltGraph")) return;
      const el = e.target as HTMLElement | null;
      if (el) {
        const tag = el.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          el.isContentEditable
        ) {
          return;
        }
      }
      if (e.key === "Tab") return;
      // A running key recording owns the keyboard.
      if (isKeyCapturing()) return;
      // A dialog owns the keyboard.
      if (document.querySelector("[role=dialog]")) return;
      const captured = keyEventToTrigger(e);
      if (!captured) return;
      const { main } = splitCombo(captured.combo);
      if (!main || !isNavigableMain(main)) return;
      if (RESERVED.has(captured.combo)) return;
      e.preventDefault();
      cb.current(captured.combo, captured.altGr);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);
}
