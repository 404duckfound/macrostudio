// EN QWERTY layout data for the canvas Keyboard tab. `name` is the exact
// combo-main string written on assign (must match keyCatalog / generator
// spellings); `null` marks a decorative key that cannot be assigned
// (wide Shift keys). `w` is the flex width in key units.

export interface MapKey {
  label: string;
  name: string | null;
  w: number;
}

export const KEYBOARD_ROWS: MapKey[][] = [
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
  ],
  [
    { label: "Shift", name: null, w: 2.25 },
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
    { label: "Shift", name: null, w: 2.75 },
  ],
  [{ label: "Space", name: "Space", w: 8 }],
];

// Mouse buttons are not part of the keyboard grid but live on the same tab:
// the side column renders them with the same keycap language.
export const MOUSE_KEYS: MapKey[] = [
  { label: "Left", name: "MouseLeft", w: 1 },
  { label: "Right", name: "MouseRight", w: 1 },
  { label: "Middle", name: "MouseMiddle", w: 1 },
  { label: "X1", name: "MouseX1", w: 1 },
  { label: "X2", name: "MouseX2", w: 1 },
];
