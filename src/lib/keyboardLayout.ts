// EN QWERTY layout data for the canvas Keyboard tab. `name` is the exact
// combo-main string written on assign (must match keyCatalog / generator
// spellings); `w` is the flex width in key units.

export interface MapKey {
  label: string;
  name: string | null;
  w: number;
}

export const KEYBOARD_ROWS: MapKey[][] = [
  [
    { label: "Esc", name: "Escape", w: 1 },
    ...Array.from({ length: 12 }, (_, i) => ({ label: `F${i + 1}`, name: `F${i + 1}`, w: 1 })),
    { label: "", name: null, w: 5.5 },
  ],
  [
    { label: "`", name: "`", w: 1 },
    { label: "1", name: "1", w: 1 },
    { label: "2", name: "2", w: 1 },
    { label: "3", name: "3", w: 1 },
    { label: "4", name: "4", w: 1 },
    { label: "5", name: "5", w: 1 },
    { label: "6", name: "6", w: 1 },
    { label: "7", name: "7", w: 1 },
    { label: "8", name: "8", w: 1 },
    { label: "9", name: "9", w: 1 },
    { label: "0", name: "0", w: 1 },
    { label: "-", name: "-", w: 1 },
    { label: "=", name: "=", w: 1 },
    { label: "Backspace", name: "Backspace", w: 2 },
    { label: "", name: null, w: 0.5 },
    { label: "Ins", name: "Insert", w: 1 },
    { label: "Home", name: "Home", w: 1 },
    { label: "PgUp", name: "PgUp", w: 1 },
  ],
  [
    { label: "Tab", name: "Tab", w: 1.5 },
    { label: "Q", name: "Q", w: 1 },
    { label: "W", name: "W", w: 1 },
    { label: "E", name: "E", w: 1 },
    { label: "R", name: "R", w: 1 },
    { label: "T", name: "T", w: 1 },
    { label: "Y", name: "Y", w: 1 },
    { label: "U", name: "U", w: 1 },
    { label: "I", name: "I", w: 1 },
    { label: "O", name: "O", w: 1 },
    { label: "P", name: "P", w: 1 },
    { label: "[", name: "[", w: 1 },
    { label: "]", name: "]", w: 1 },
    { label: "\\", name: "\\", w: 1.5 },
    { label: "", name: null, w: 0.5 },
    { label: "Del", name: "Delete", w: 1 },
    { label: "End", name: "End", w: 1 },
    { label: "PgDn", name: "PgDn", w: 1 },
  ],
  [
    { label: "Caps", name: "CapsLock", w: 1.75 },
    { label: "A", name: "A", w: 1 },
    { label: "S", name: "S", w: 1 },
    { label: "D", name: "D", w: 1 },
    { label: "F", name: "F", w: 1 },
    { label: "G", name: "G", w: 1 },
    { label: "H", name: "H", w: 1 },
    { label: "J", name: "J", w: 1 },
    { label: "K", name: "K", w: 1 },
    { label: "L", name: "L", w: 1 },
    { label: ";", name: ";", w: 1 },
    { label: "'", name: "'", w: 1 },
    { label: "Enter", name: "Enter", w: 2.25 },
    { label: "", name: null, w: 3.5 },
  ],
  [
    { label: "Shift", name: "Shift", w: 2.5 },
    { label: "Z", name: "Z", w: 1 },
    { label: "X", name: "X", w: 1 },
    { label: "C", name: "C", w: 1 },
    { label: "V", name: "V", w: 1 },
    { label: "B", name: "B", w: 1 },
    { label: "N", name: "N", w: 1 },
    { label: "M", name: "M", w: 1 },
    { label: ",", name: ",", w: 1 },
    { label: ".", name: ".", w: 1 },
    { label: "/", name: "/", w: 1 },
    { label: "Shift", name: "Shift", w: 2.5 },
    { label: "", name: null, w: 1.5 },
    { label: "↑", name: "Up", w: 1 },
    { label: "", name: null, w: 1 },
  ],
  [
    { label: "Ctrl", name: "Ctrl", w: 1.25 },
    { label: "Win", name: "Win", w: 1.25 },
    { label: "Alt", name: "Alt", w: 1.25 },
    { label: "Space", name: "Space", w: 6.25 },
    { label: "Alt", name: "Alt", w: 1.25 },
    { label: "Win", name: "Win", w: 1.25 },
    { label: "Menu", name: "AppsKey", w: 1.25 },
    { label: "Ctrl", name: "Ctrl", w: 1.25 },
    { label: "", name: null, w: 0.5 },
    { label: "←", name: "Left", w: 1 },
    { label: "↓", name: "Down", w: 1 },
    { label: "→", name: "Right", w: 1 },
  ],
];

// Mouse buttons are not part of the keyboard grid but live on the same tab:
// the side column draws a mouse and turns these names into its clickable
// areas. `name` is the exact main-key spelling the generator matches
// (MouseLeft -> LButton), so it must not be re-cased.
export const MOUSE_KEYS: { label: string; name: string }[] = [
  { label: "Left", name: "MouseLeft" },
  { label: "Right", name: "MouseRight" },
  { label: "Middle", name: "MouseMiddle" },
  { label: "X1", name: "MouseX1" },
  { label: "X2", name: "MouseX2" },
];
