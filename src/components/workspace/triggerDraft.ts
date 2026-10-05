import type { Trigger } from "../../types";

export function cleanDraft(drafts: Trigger[]): Trigger[] {
  const seen = new Set<string>();
  const out: Trigger[] = [];
  for (const t of drafts) {
    const shortcut = t.shortcut.trim();
    if (!shortcut || seen.has(shortcut)) continue;
    seen.add(shortcut);
    out.push({ shortcut, actions: t.actions });
  }
  return out;
}

export function toDrafts(triggers: Trigger[] | undefined): Trigger[] {
  if (!triggers?.length) return [];
  return triggers.map((t) => ({
    shortcut: t.shortcut,
    actions: t.actions
      .slice(0, 1)
      .map((a) =>
        a.type === "custom"
          ? { type: "custom", blocks: a.blocks.map((b) => ({ ...b })) }
          : { ...a },
      ),
  }));
}
