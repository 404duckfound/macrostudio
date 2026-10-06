import type { Macro, MacroAction, Trigger } from "../../types";

// Actions the UI can no longer edit or compile (removed types like custom
// and keys, or unknown future ones) are dropped on clean/save, mirroring the
// backend's lenient parsing. Otherwise they would linger in JSON forever.
const EDITABLE_ACTION_TYPES = new Set(["key", "mouse", "macro", "script"]);

function isDroppedAction(a: MacroAction): boolean {
  return !EDITABLE_ACTION_TYPES.has((a as { type: string }).type);
}

export function cleanDraft(drafts: Trigger[]): Trigger[] {
  const seen = new Set<string>();
  const out: Trigger[] = [];
  for (const t of drafts) {
    const shortcut = t.shortcut.trim();
    if (!shortcut || seen.has(shortcut)) continue;
    seen.add(shortcut);
    out.push({
      shortcut,
      actions: t.actions.filter((a) => !isDroppedAction(a)).map((a) => ({ ...a })),
      block_key: t.block_key,
    });
  }
  return out;
}

export function toDrafts(triggers: Trigger[] | undefined): Trigger[] {
  if (!triggers?.length) return [];
  return triggers.map((t) => ({
    shortcut: t.shortcut,
    block_key: t.block_key,
    actions: t.actions.filter((a) => !isDroppedAction(a)).slice(0, 1).map((a) => ({ ...a })),
  }));
}

// Runner signature input: the referenced macros' bodies ride along so editing
// a macro restarts the running profile. Unknown ids resolve to null (same
// rule as the backend compiler: dangling refs emit nothing).
export function macroSignature(triggers: Trigger[], macros: Macro[]): string {
  const ids = new Set<string>();
  for (const t of triggers) {
    for (const a of t.actions) {
      if (a.type === "macro") ids.add(a.macro_id);
    }
  }
  const bodies = [...ids]
    .sort()
    .map((id) => macros.find((m) => m.id === id)?.blocks ?? null);
  return JSON.stringify([triggers, bodies]);
}
