export function parseTrigger(trigger: string): string[] {
  return trigger
    .split("+")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function heldModifiers(e: {
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}): string[] {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.shiftKey) parts.push("Shift");
  if (e.altKey) parts.push("Alt");
  if (e.metaKey) parts.push("Meta");
  return parts;
}

// BrowserKeyEvent.key reports arrows as ArrowUp/ArrowDown/... but AHK spells
// them Up/Down/... in both hotkey position and {Key} braces. Normalising here
// keeps keymap.ts and the generator in agreement.
const KEY_EVENT_ALIASES: Record<string, string> = {
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
};

export interface CapturedCombo {
  combo: string;
  // True while AltGraph is held: the trigger needs left-Ctrl + right-Alt
  // sides to fire on AltGr alone instead of any Ctrl+Alt.
  altGr: boolean;
}

export function keyEventToTrigger(
  e: KeyboardEvent,
  preserveCase = false,
): CapturedCombo | null {
  if (e.key === "Escape") return null;
  if (["Control", "Shift", "Alt", "Meta", "AltGraph"].includes(e.key)) {
    return null;
  }
  const altGr =
    typeof e.getModifierState === "function" &&
    e.getModifierState("AltGraph");
  let key: string;
  if (altGr && !preserveCase) {
    // AltGraph produces a layout char (e.g. "@"); the trigger must name the
    // physical key, so derive it from the code (KeyM -> M, Digit2 -> 2).
    const codeKey =
      /^Key([A-Z])$/.exec(e.code)?.[1] ?? /^Digit([0-9])$/.exec(e.code)?.[1];
    const raw = codeKey ?? KEY_EVENT_ALIASES[e.key] ?? e.key;
    if (raw === " ") key = "Space";
    else if (raw.length === 1) key = raw.toUpperCase();
    else key = raw.charAt(0).toUpperCase() + raw.slice(1);
  } else {
    key = KEY_EVENT_ALIASES[e.key] ?? e.key;
    if (key === " ") key = "Space";
    else if (!preserveCase) {
      if (key.length === 1) key = key.toUpperCase();
      else key = key.charAt(0).toUpperCase() + key.slice(1);
    }
  }
  return { combo: [...heldModifiers(e), key].join("+"), altGr };
}

const MOUSE_EVENT_BUTTONS = [
  "MouseLeft",
  "MouseMiddle",
  "MouseRight",
  "MouseX1",
  "MouseX2",
];

export function mouseEventToTrigger(e: MouseEvent): string | null {
  const btn = MOUSE_EVENT_BUTTONS[e.button] ?? null;
  if (!btn) return null;
  return [...heldModifiers(e), btn].join("+");
}
