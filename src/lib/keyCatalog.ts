// Shared key catalog for the manual Key Picker (trigger shortcut + action
// Key Press). Names here must stay in agreement with `keys.ts`
// (KEY_EVENT_ALIASES normalization) and `generator.rs` (`brace_key_name` /
// `native_key_name` / `map_trigger_hotkey`): the generator passes unknown
// names through verbatim, so every name below must be a valid AHK v2 Send /
// hotkey name. Spellings were inventoried from those two files plus the AHK
// Send key table; symbol/numpad spellings still need Neco's approval.

export type KeyCategoryId = "keyboard" | "fkeys" | "mouse";

interface KeyCategory {
  id: KeyCategoryId;
  title: string;
  desc: string;
}

interface KeyEntry {
  /** Exact string written into the combo (AHK-compatible spelling). */
  name: string;
  /** Lowercase search haystack: name aliases + plain-language words. */
  keywords: string;
  category: KeyCategoryId;
}

export const KEY_CATEGORIES: KeyCategory[] = [
  { id: "keyboard", title: "Keyboard", desc: "Letters, digits, symbols, numpad" },
  { id: "fkeys", title: "F Keys", desc: "F1–F24" },
  { id: "mouse", title: "Mouse", desc: "Buttons, incl. modifiers" },
];

/** Modifier tick values in canonical combo order (matches keys.ts heldModifiers). */
export const MODIFIERS = ["Ctrl", "Shift", "Alt", "Meta"] as const;

const LETTERS = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i),
).map((name) => ({
  name,
  keywords: `${name.toLowerCase()} letter`,
  category: "keyboard" as KeyCategoryId,
}));

const DIGITS = Array.from({ length: 10 }, (_, i) => String(i)).map((name) => ({
  name,
  keywords: `${name} digit number`,
  category: "keyboard" as KeyCategoryId,
}));

const SPECIAL: KeyEntry[] = [
  { name: "Enter", keywords: "enter return", category: "keyboard" },
  { name: "Tab", keywords: "tab", category: "keyboard" },
  { name: "Space", keywords: "space spacebar bar", category: "keyboard" },
  { name: "Backspace", keywords: "backspace", category: "keyboard" },
  { name: "Delete", keywords: "delete del", category: "keyboard" },
  { name: "Insert", keywords: "insert ins", category: "keyboard" },
  { name: "Home", keywords: "home", category: "keyboard" },
  { name: "End", keywords: "end", category: "keyboard" },
  { name: "PgUp", keywords: "pgup page up", category: "keyboard" },
  { name: "PgDn", keywords: "pgdn page down", category: "keyboard" },
  { name: "Up", keywords: "up arrow", category: "keyboard" },
  { name: "Down", keywords: "down arrow", category: "keyboard" },
  { name: "Left", keywords: "left arrow", category: "keyboard" },
  { name: "Right", keywords: "right arrow", category: "keyboard" },
  { name: "Escape", keywords: "escape esc", category: "keyboard" },
  { name: "CapsLock", keywords: "caps lock capslock", category: "keyboard" },
  { name: "NumLock", keywords: "num lock numlock", category: "keyboard" },
  { name: "ScrollLock", keywords: "scroll lock scrolllock", category: "keyboard" },
  {
    name: "PrintScreen",
    keywords: "print screen printscreen prtsc screenshot",
    category: "keyboard",
  },
  { name: "Pause", keywords: "pause break", category: "keyboard" },
  { name: "AppsKey", keywords: "apps menu context application", category: "keyboard" },
];

const SYMBOLS: KeyEntry[] = [
  { name: "`", keywords: "` backquote backtick grave", category: "keyboard" },
  { name: "-", keywords: "- minus hyphen dash", category: "keyboard" },
  { name: "=", keywords: "= equal equals", category: "keyboard" },
  { name: "[", keywords: "[ bracket left open", category: "keyboard" },
  { name: "]", keywords: "] bracket right close", category: "keyboard" },
  { name: "\\", keywords: "\\ backslash", category: "keyboard" },
  { name: ";", keywords: "; semicolon", category: "keyboard" },
  { name: "'", keywords: "' quote apostrophe", category: "keyboard" },
  { name: ",", keywords: ", comma", category: "keyboard" },
  { name: ".", keywords: ". period dot", category: "keyboard" },
  { name: "/", keywords: "/ slash", category: "keyboard" },
];

const NUMPAD: KeyEntry[] = [
  ...Array.from({ length: 10 }, (_, i) => ({
    name: `Numpad${i}`,
    keywords: `numpad${i} numpad ${i} num ${i}`,
    category: "keyboard" as KeyCategoryId,
  })),
  { name: "NumpadDot", keywords: "numpaddot numpad dot decimal .", category: "keyboard" },
  { name: "NumpadDiv", keywords: "numpaddiv numpad divide /", category: "keyboard" },
  { name: "NumpadMult", keywords: "numpadmult numpad multiply *", category: "keyboard" },
  { name: "NumpadAdd", keywords: "numpadadd numpad add plus +", category: "keyboard" },
  { name: "NumpadSub", keywords: "numpadsub numpad subtract minus -", category: "keyboard" },
  { name: "NumpadEnter", keywords: "numpadenter numpad enter return", category: "keyboard" },
];

const FKEYS: KeyEntry[] = Array.from({ length: 24 }, (_, i) => ({
  name: `F${i + 1}`,
  keywords: `f${i + 1} function`,
  category: "fkeys" as KeyCategoryId,
}));

const MOUSE: KeyEntry[] = [
  { name: "MouseLeft", keywords: "mouseleft mouse left click button lbutton", category: "mouse" },
  { name: "MouseRight", keywords: "mouseright mouse right click button rbutton", category: "mouse" },
  {
    name: "MouseMiddle",
    keywords: "mousemiddle mouse middle click wheel button mbutton",
    category: "mouse",
  },
  { name: "MouseX1", keywords: "mousex1 mouse x1 side extra forward xbutton1", category: "mouse" },
  { name: "MouseX2", keywords: "mousex2 mouse x2 side extra back xbutton2", category: "mouse" },
];

const KEY_ENTRIES: KeyEntry[] = [
  ...LETTERS,
  ...DIGITS,
  ...SPECIAL,
  ...SYMBOLS,
  ...NUMPAD,
  ...FKEYS,
  ...MOUSE,
];

export function keysInCategory(
  category: KeyCategoryId,
  excludeLeftMouse: boolean,
): KeyEntry[] {
  return KEY_ENTRIES.filter(
    (e) =>
      e.category === category &&
      !(excludeLeftMouse && e.name === "MouseLeft"),
  );
}

export function searchKeys(
  query: string,
  excludeLeftMouse: boolean,
): KeyEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return KEY_ENTRIES.filter(
    (e) =>
      !(excludeLeftMouse && e.name === "MouseLeft") &&
      (e.name.toLowerCase().includes(q) || e.keywords.includes(q)),
  ).slice(0, 60);
}

function isModifier(part: string): boolean {
  return (MODIFIERS as readonly string[]).includes(part);
}

export function splitCombo(combo: string): {
  modifiers: string[];
  main: string | null;
} {
  const parts = combo
    .split("+")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const modifiers = MODIFIERS.filter((m) => parts.includes(m));
  const rest = parts.filter((p) => !isModifier(p));
  return { modifiers, main: rest.length > 0 ? rest[rest.length - 1] : null };
}

/** Trigger side uppercases single chars ("a" -> "A"); action side preserves. */
function normalizeMainKey(main: string, preserveCase: boolean): string {
  if (!preserveCase && main.length === 1) return main.toUpperCase();
  return main;
}

export function buildCombo(
  ticks: string[],
  main: string,
  preserveCase: boolean,
): string {
  const ordered = MODIFIERS.filter((m) => ticks.includes(m));
  return [...ordered, normalizeMainKey(main, preserveCase)].join("+");
}
