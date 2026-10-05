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

export function keyEventToTrigger(
  e: KeyboardEvent,
  preserveCase = false,
): string | null {
  if (e.key === "Escape") return null;
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return null;
  let key = KEY_EVENT_ALIASES[e.key] ?? e.key;
  if (key === " ") key = "Space";
  else if (!preserveCase) {
    if (key.length === 1) key = key.toUpperCase();
    else key = key.charAt(0).toUpperCase() + key.slice(1);
  }
  return [...heldModifiers(e), key].join("+");
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
