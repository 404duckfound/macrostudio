interface KeyMeta {
  vk: string;
  glyph: string;
}

const TABLE: Record<string, KeyMeta> = {
  Enter: { vk: "VK_RETURN", glyph: "↵" },
  Space: { vk: "VK_SPACE", glyph: "" },
  Tab: { vk: "VK_TAB", glyph: "" },
  Escape: { vk: "VK_ESCAPE", glyph: "⎋" },
  Backspace: { vk: "VK_BACK", glyph: "" },
  Delete: { vk: "VK_DELETE", glyph: "" },
  Insert: { vk: "VK_INSERT", glyph: "" },
  Home: { vk: "VK_HOME", glyph: "" },
  End: { vk: "VK_END", glyph: "" },
  PageUp: { vk: "VK_PRIOR", glyph: "" },
  PageDown: { vk: "VK_NEXT", glyph: "" },
  Up: { vk: "VK_UP", glyph: "↑" },
  Down: { vk: "VK_DOWN", glyph: "↓" },
  Left: { vk: "VK_LEFT", glyph: "←" },
  Right: { vk: "VK_RIGHT", glyph: "→" },
  Shift: { vk: "VK_LSHIFT", glyph: "" },
  Ctrl: { vk: "VK_LCONTROL", glyph: "" },
  Alt: { vk: "VK_LMENU", glyph: "" },
  Win: { vk: "VK_LWIN", glyph: "" },
  Meta: { vk: "VK_LWIN", glyph: "" },
  F1: { vk: "VK_F1", glyph: "" },
  F2: { vk: "VK_F2", glyph: "" },
  F3: { vk: "VK_F3", glyph: "" },
  F4: { vk: "VK_F4", glyph: "" },
  F5: { vk: "VK_F5", glyph: "" },
  F6: { vk: "VK_F6", glyph: "" },
  F7: { vk: "VK_F7", glyph: "" },
  F8: { vk: "VK_F8", glyph: "" },
  F9: { vk: "VK_F9", glyph: "" },
  F10: { vk: "VK_F10", glyph: "" },
  F11: { vk: "VK_F11", glyph: "" },
  F12: { vk: "VK_F12", glyph: "" },
  MouseLeft: { vk: "VK_LBUTTON", glyph: "" },
  MouseMiddle: { vk: "VK_MBUTTON", glyph: "" },
  MouseRight: { vk: "VK_RBUTTON", glyph: "" },
  MouseX1: { vk: "VK_XBUTTON1", glyph: "" },
  MouseX2: { vk: "VK_XBUTTON2", glyph: "" },
};

export function keyParts(combo: string): string[] {
  return combo
    .split("+")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

function meta(part: string): KeyMeta {
  const known = TABLE[part];
  if (known) return known;
  if (/^F\d{1,2}$/.test(part)) return { vk: `VK_${part}`, glyph: "" };
  if (/^[A-Za-z]$/.test(part)) {
    // Buyuk harfe cevirmeden charCode alinirsa "a" icin VK_61 cikar, yanlis.
    const hex = part
      .toUpperCase()
      .charCodeAt(0)
      .toString(16)
      .toUpperCase()
      .padStart(2, "0");
    return { vk: `VK_${hex}`, glyph: "" };
  }
  return { vk: `VK_${part.toUpperCase()}`, glyph: "" };
}

export function keyChipLabel(part: string): string {
  const m = meta(part);
  return m.glyph ? `${part} ${m.glyph}` : part;
}

export function keyVkSubtitle(combo: string): string {
  const parts = keyParts(combo);
  if (parts.length === 0) return "No key target";
  return parts.map((p) => meta(p).vk).join(" + ");
}
