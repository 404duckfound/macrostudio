const GLYPHS: Record<string, string> = {
  Enter: "↵",
  Escape: "⎋",
  Up: "↑",
  Down: "↓",
  Left: "←",
  Right: "→",
};

export function keyParts(combo: string): string[] {
  return combo
    .split("+")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function keyChipLabel(part: string): string {
  const glyph = GLYPHS[part];
  return glyph ? `${part} ${glyph}` : part;
}