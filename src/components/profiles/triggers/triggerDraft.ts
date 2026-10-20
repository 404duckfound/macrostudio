import type { Macro, MacroAction, ModSide, Trigger } from "../../../types";

// Actions the UI can no longer edit or compile (removed types like custom
// and keys, or unknown future ones) are dropped on clean/save, mirroring the
// backend's lenient parsing. Otherwise they would linger in JSON forever.
const EDITABLE_ACTION_TYPES = new Set(["key", "mouse", "macro", "script"]);

function isDroppedAction(a: MacroAction): boolean {
  return !EDITABLE_ACTION_TYPES.has((a as { type: string }).type);
}

// Sides for modifiers no longer in the shortcut are meaningless (the
// generator only looks up parts that are present), so drop them.
export function pruneSides(
  shortcut: string,
  sides: Record<string, ModSide>,
): Record<string, ModSide> {
  const parts = new Set(shortcut.split("+").map((p) => p.trim()));
  const out: Record<string, ModSide> = {};
  for (const [mod, side] of Object.entries(sides ?? {})) {
    if (parts.has(mod)) out[mod] = side;
  }
  return out;
}

export function cleanDraft(drafts: Trigger[]): Trigger[] {
  const seen = new Set<string>();
  const out: Trigger[] = [];
  for (const t of drafts) {
    const shortcut = t.shortcut.trim();
    if (!shortcut) continue;
    // A trigger with no action does nothing, so saving must not leave it
    // behind: it would sit in JSON forever as a dead key.
    if (t.actions.length === 0) continue;
    if (seen.has(shortcut)) continue;
    seen.add(shortcut);
    out.push({
      shortcut,
      actions: t.actions.filter((a) => !isDroppedAction(a)).map((a) => ({ ...a })),
      block_key: t.block_key,
      fire_on_release: t.fire_on_release ?? false,
      mod_sides: pruneSides(shortcut, t.mod_sides),
      wildcard: t.wildcard ?? false,
      force_hook: t.force_hook ?? false,
    });
  }
  return out;
}

export interface DraftDropReport {
  /** Draft indices `cleanDraft` will omit on save, in list order. */
  dropped: number[];
  /** Draft indices whose shortcut repeats one that survived, so it is dropped. */
  duplicates: number[];
  noAction: number;
  duplicate: number;
  emptyShortcut: number;
  total: number;
}

/**
 * Mirrors `cleanDraft`'s filters so the editor can warn about the cards a save
 * will drop. Without this the only duplicate-shortcut signal was the silent
 * disappearance of the second card after saving.
 */
export function draftDropReport(drafts: Trigger[]): DraftDropReport {
  const seen = new Set<string>();
  const report: DraftDropReport = {
    dropped: [],
    duplicates: [],
    noAction: 0,
    duplicate: 0,
    emptyShortcut: 0,
    total: 0,
  };
  drafts.forEach((t, index) => {
    const shortcut = t.shortcut.trim();
    if (!shortcut) {
      report.dropped.push(index);
      report.emptyShortcut += 1;
      return;
    }
    if (t.actions.length === 0) {
      report.dropped.push(index);
      report.noAction += 1;
      return;
    }
    if (seen.has(shortcut)) {
      report.dropped.push(index);
      report.duplicates.push(index);
      report.duplicate += 1;
      return;
    }
    seen.add(shortcut);
  });
  report.total = report.dropped.length;
  return report;
}

/** The reasons behind a drop report, e.g. "1 without an action, 2 with a duplicate shortcut". */
function dropReasons(report: DraftDropReport): string[] {
  const reasons: string[] = [];
  if (report.noAction > 0) reasons.push(`${report.noAction} without an action`);
  if (report.duplicate > 0)
    reasons.push(`${report.duplicate} with a duplicate shortcut`);
  if (report.emptyShortcut > 0)
    reasons.push(`${report.emptyShortcut} without a shortcut`);
  return reasons;
}

/** One line naming every reason a save will omit a draft card. */
export function dropReportMessage(report: DraftDropReport): string {
  if (report.total === 0) return "";
  if (report.total === 1) {
    if (report.noAction === 1)
      return "1 trigger has no action and will be dropped on save";
    if (report.duplicate === 1)
      return "1 trigger repeats a shortcut and will be dropped on save";
    return "1 trigger has no shortcut and will be dropped on save";
  }
  return `${report.total} triggers will be dropped on save (${dropReasons(report).join(", ")})`;
}

/**
 * The same report in the past tense, for the line a save leaves behind. A card
 * that vanishes on save is the bug this report exists for, so the drop is
 * announced as well as warned about.
 */
export function droppedReportMessage(report: DraftDropReport): string {
  if (report.total === 0) return "";
  if (report.total === 1) {
    if (report.noAction === 1)
      return "Saved - 1 trigger without an action was dropped";
    if (report.duplicate === 1)
      return "Saved - 1 trigger with a duplicate shortcut was dropped";
    return "Saved - 1 trigger without a shortcut was dropped";
  }
  return `Saved - ${report.total} triggers were dropped (${dropReasons(report).join(", ")})`;
}

export function toDrafts(triggers: Trigger[] | undefined): Trigger[] {
  if (!triggers?.length) return [];
  return triggers.map((t) => ({
    shortcut: t.shortcut,
    block_key: t.block_key,
    fire_on_release: t.fire_on_release ?? false,
    mod_sides: { ...(t.mod_sides ?? {}) },
    wildcard: t.wildcard ?? false,
    force_hook: t.force_hook ?? false,
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
