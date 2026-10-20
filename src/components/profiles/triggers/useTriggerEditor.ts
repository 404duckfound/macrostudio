import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  useKeyCapture,
  type KeyCaptureOptions,
} from "../../../hooks/useKeyCapture";
import { parseTrigger } from "../../../lib/keys";
import { sameCombo, splitCombo } from "../../../lib/keyCatalog";
import { useProfileStore } from "../../../stores/useProfileStore";
import type { MacroAction, ModSide, Profile, Trigger } from "../../../types";
import { cleanDraft, draftDropReport, toDrafts } from "./triggerDraft";

// AltGr is LeftCtrl + RightAlt physically: pin the recorded combo to those
// sides so the trigger fires on AltGr alone instead of any Ctrl+Alt.
function altGrSides(combo: string): Record<string, ModSide> {
  const parts = combo.split("+").map((p) => p.trim());
  const sides: Record<string, ModSide> = {};
  if (parts.includes("Ctrl")) sides["Ctrl"] = "left";
  if (parts.includes("Alt")) sides["Alt"] = "right";
  return sides;
}

function blankTrigger(shortcut = ""): Trigger {
  return {
    shortcut,
    actions: [],
    block_key: false,
    fire_on_release: false,
    mod_sides: {},
    wildcard: false,
    force_hook: false,
  };
}

/**
 * The whole trigger editing state machine for one profile: the draft list, the
 * selection, shortcut capture, and every mutation on them.
 *
 * It stays a hook rather than a store slice because the draft is intentionally
 * thrown away when the active profile changes - the drafts are not shared
 * state, they are unsaved work belonging to whoever is looking at the screen.
 */
export function useTriggerEditor(active: Profile | null) {
  const [draftTriggers, setDraftTriggers] = useState<Trigger[]>(
    active?.triggers ?? [],
  );
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openMenuIdx, setOpenMenuIdx] = useState<number | null>(null);
  const [matchPicker, setMatchPicker] = useState<{
    mainKey: string;
    /** Shortcut the chooser's create row writes, so a physical press keeps its modifiers. */
    createCombo: string;
    indices: number[];
    anchor: { top: number; right: number };
  } | null>(null);
  // Map clicks have no modifiers of their own, so the click path asks first.
  // Physical presses already carry their combo and skip this.
  const [modifierPicker, setModifierPicker] = useState<{
    mainKey: string;
    anchor: { top: number; right: number };
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [flashAction, setFlashAction] = useState(false);

  useEffect(() => {
    setDraftTriggers(toDrafts(active?.triggers));
    setSelectedIdx(0);
    setRecording(false);
    setPickerOpen(false);
    setMatchPicker(null);
    setModifierPicker(null);
  }, [active?.id, active?.triggers]);

  useEffect(() => {
    if (openMenuIdx === null) return;
    function onDocClick() {
      setOpenMenuIdx(null);
    }
    function onDocKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuIdx(null);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [openMenuIdx]);

  const sel = Math.min(selectedIdx, Math.max(0, draftTriggers.length - 1));
  const selected = draftTriggers[sel] ?? null;

  const captureShortcut = useCallback(
    (combo: string, altGr = false) => {
      const clash = draftTriggers.some(
        (x, i) => i !== sel && x.shortcut.trim() === combo.trim(),
      );
      if (clash) {
        setCaptureError(`"${combo.trim()}" is already used by another trigger.`);
        setRecording(false);
        return;
      }
      setCaptureError(null);
      setDraftTriggers((prev) =>
        prev.map((x, i) =>
          i === sel
            ? {
                ...x,
                shortcut: combo,
                ...(altGr ? { mod_sides: altGrSides(combo) } : {}),
              }
            : x,
        ),
      );
      setRecording(false);
    },
    [draftTriggers, sel],
  );

  const cancelCapture = useCallback(() => setRecording(false), []);

  // Manual picker writes use the identical clash rule as Record. Manual
  // ticks carry no side info, so stale sides for removed modifiers are
  // pruned; sides for remaining modifiers are kept (AltGr record followed
  // by a manual tick must not lose its left/right pins).
  const applyPickerShortcut = useCallback(
    (combo: string) => {
      const clash = draftTriggers.some(
        (x, i) => i !== sel && x.shortcut.trim() === combo.trim(),
      );
      if (clash) {
        setCaptureError(`"${combo.trim()}" is already used by another trigger.`);
        setPickerOpen(false);
        return;
      }
      setCaptureError(null);
      const keep = new Set(combo.split("+").map((p) => p.trim()));
      setDraftTriggers((prev) =>
        prev.map((x, i) => {
          if (i !== sel) return x;
          const mod_sides: Record<string, ModSide> = {};
          for (const [mod, side] of Object.entries(x.mod_sides ?? {})) {
            if (keep.has(mod)) mod_sides[mod] = side;
          }
          return { ...x, shortcut: combo, mod_sides };
        }),
      );
    },
    [draftTriggers, sel],
  );

  const captureOptions: KeyCaptureOptions = { ignoreLeftClick: true };
  useKeyCapture(recording, captureShortcut, cancelCapture, captureOptions);

  function openPicker() {
    setRecording(false);
    setCaptureError(null);
    setModifierPicker(null);
    setPickerOpen(true);
  }

  function startRecording() {
    setPickerOpen(false);
    setCaptureError(null);
    setModifierPicker(null);
    setRecording(true);
  }

  const selectedChips = parseTrigger(selected?.shortcut ?? "");
  const selectedMain = (() => {
    const { main } = splitCombo(selected?.shortcut ?? "");
    return main ? main.toUpperCase() : null;
  })();

  const assignedMains = useMemo(() => {
    const set = new Set<string>();
    for (const t of draftTriggers) {
      const { main } = splitCombo(t.shortcut);
      if (main) set.add(main.toUpperCase());
    }
    return set;
  }, [draftTriggers]);

  // Main key -> draft indices. Several triggers can share one main key
  // (Ctrl+P and Shift+P both land on P), so this is a list, not a map to one.
  const triggersByMain = useMemo(() => {
    const map = new Map<string, number[]>();
    draftTriggers.forEach((t, index) => {
      const { main } = splitCombo(t.shortcut);
      if (!main) return;
      const key = main.toUpperCase();
      const list = map.get(key);
      if (list) list.push(index);
      else map.set(key, [index]);
    });
    return map;
  }, [draftTriggers]);

  const cleanTriggers = useMemo(() => cleanDraft(draftTriggers), [draftTriggers]);
  // Save silently omitted cards that had no action or repeated a shortcut.
  // The report makes both visible: the header counts them and the inspector
  // shows the same red clash message a rejected Record/Key Picker combo gets.
  const dropReport = useMemo(
    () => draftDropReport(draftTriggers),
    [draftTriggers],
  );
  const willDropCard = dropReport.total > 0;
  const duplicateConflict = useMemo(() => {
    const t = draftTriggers[sel];
    if (!t || !dropReport.duplicates.includes(sel)) return null;
    return `"${t.shortcut.trim()}" is already used by another trigger.`;
  }, [draftTriggers, sel, dropReport]);
  const dirty =
    active != null &&
    JSON.stringify(cleanTriggers) !== JSON.stringify(active.triggers);

  function selectTriggerAt(idx: number) {
    setSelectedIdx(idx);
    setRecording(false);
    setPickerOpen(false);
    setModifierPicker(null);
  }

  function patchSelected(patch: (t: Trigger) => Trigger) {
    setDraftTriggers((prev) => prev.map((x, i) => (i === sel ? patch(x) : x)));
  }

  function addTrigger() {
    setDraftTriggers((prev) => [...prev, blankTrigger()]);
    setSelectedIdx(draftTriggers.length);
  }

  function openEmptyOn(shortcut: string, altGr = false) {
    // An unfinished card is still being filled in: rewrite its key instead of
    // piling up another empty one. Pressing five keys should not leave five
    // cards behind.
    if (selected && selected.actions.length === 0) {
      patchSelected((x) => ({
        ...x,
        shortcut,
        mod_sides: altGr ? altGrSides(shortcut) : {},
      }));
      return;
    }
    setDraftTriggers((prev) => [
      ...prev,
      { ...blankTrigger(shortcut), mod_sides: altGr ? altGrSides(shortcut) : {} },
    ]);
    setSelectedIdx(draftTriggers.length);
  }

  // The map navigates and starts triggers; it never reassigns the selected one.
  function mapKeyDown(name: string, anchor: { top: number; right: number }) {
    // Lookups are case-insensitive, but the combo must keep the canonical
    // spelling: the generator matches "MouseLeft" exactly, not "MOUSELEFT".
    const indices = triggersByMain.get(name.toUpperCase()) ?? [];
    if (indices.length === 1) {
      selectTriggerAt(indices[0]);
      return;
    }
    if (indices.length > 1) {
      setModifierPicker(null);
      setMatchPicker({
        mainKey: name.toUpperCase(),
        createCombo: name,
        indices,
        anchor,
      });
      return;
    }
    setMatchPicker(null);
    setModifierPicker({ mainKey: name, anchor });
  }

  // Pointer path: the map has no modifier state, so the chosen combo goes
  // through the same clash rule as Record and the manual Key Picker.
  function createOnMain(combo: string): string | null {
    const clash = draftTriggers.some((x) => sameCombo(x.shortcut, combo));
    if (clash) return `"${combo}" is already used by another trigger.`;
    setCaptureError(null);
    // Always adds a card: the physical-press path rewrites an unfinished one,
    // but the map flow is a deliberate creation and must not drop what the
    // user just built.
    setDraftTriggers((prev) => [...prev, blankTrigger(combo)]);
    setSelectedIdx(draftTriggers.length);
    setModifierPicker(null);
    return null;
  }

  // The chooser is anchored to the map key that was pressed; a physical press
  // has no pointer rect, so the rendered cell is the anchor.
  function mapCellAnchor(mainKey: string): { top: number; right: number } {
    const cell = document.querySelector<HTMLElement>(
      `[data-map-key="${CSS.escape(mainKey)}"]`,
    );
    if (!cell) return { top: 0, right: 0 };
    const r = cell.getBoundingClientRect();
    return { top: r.bottom + 4, right: r.right };
  }

  // A physical key press on the keyboard map. The main key picks the trigger
  // - the same rule the map cell uses - and the modifiers only survive when
  // a new trigger has to be created, because there the pressed combo is
  // what the user asked for.
  function pressKey(combo: string, altGr: boolean) {
    setModifierPicker(null);
    const { main } = splitCombo(combo);
    if (!main) return;
    const key = main.toUpperCase();
    const exact = draftTriggers.findIndex((t) => sameCombo(t.shortcut, combo));
    if (exact >= 0) {
      selectTriggerAt(exact);
      setMatchPicker(null);
      return;
    }
    const indices = triggersByMain.get(key) ?? [];
    if (indices.length === 1) {
      selectTriggerAt(indices[0]);
      setMatchPicker(null);
      return;
    }
    if (indices.length > 1) {
      setMatchPicker({
        mainKey: key,
        createCombo: combo,
        indices,
        anchor: mapCellAnchor(key),
      });
      return;
    }
    setMatchPicker(null);
    openEmptyOn(combo, altGr);
  }

  function duplicateTrigger(idx: number) {
    setDraftTriggers((prev) => {
      const src = prev[idx];
      if (!src) return prev;
      const copy: Trigger = {
        ...src,
        mod_sides: { ...src.mod_sides },
        actions: src.actions.map((a) => ({ ...a })),
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    // The copy keeps the source shortcut by design; the duplicate warning is
    // derived from the draft list, so it appears on the new card immediately
    // and disappears as soon as the user gives it its own combo.
    setCaptureError(null);
    setRecording(false);
    setSelectedIdx(idx + 1);
    setOpenMenuIdx(null);
  }

  function deleteTrigger(idx: number) {
    setDraftTriggers((prev) => prev.filter((_, i) => i !== idx));
    setSelectedIdx((cur) => Math.max(0, Math.min(cur, draftTriggers.length - 2)));
    setRecording(false);
    setPickerOpen(false);
    setOpenMenuIdx(null);
  }

  function removeSelected() {
    setDraftTriggers((prev) => prev.filter((_, i) => i !== sel));
    setSelectedIdx(Math.max(0, sel - 1));
    setRecording(false);
    setPickerOpen(false);
  }

  function setSingleAction(next: MacroAction | null) {
    patchSelected((x) => ({ ...x, actions: next ? [next] : [] }));
  }

  function clearSelectedShortcut() {
    patchSelected((x) => ({ ...x, shortcut: "" }));
  }

  // Row "+ Assign action": select the row, then bring the inspector's
  // Action step into view with a brief ring flash.
  function focusActionStep(idx: number) {
    setSelectedIdx(idx);
    setRecording(false);
    setPickerOpen(false);
    requestAnimationFrame(() => {
      document
        .getElementById("inspector-step-action")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    setFlashAction(true);
    window.setTimeout(() => setFlashAction(false), 1300);
  }

  function selectActionType(type: MacroAction["type"]) {
    let fresh: MacroAction;
    switch (type) {
      case "mouse":
        fresh = { type: "mouse", button: "Left", x: 0, y: 0 };
        break;
      case "macro":
        fresh = { type: "macro", macro_id: "" };
        break;
      case "script":
        fresh = { type: "script", code: "" };
        break;
      case "key":
        fresh = {
          type: "key",
          key: "",
          behavior: "tap",
          pre_delay_ms: 0,
          repeat: 1,
        };
        break;
    }
    setSingleAction(fresh);
  }

  function discardChanges() {
    setDraftTriggers(toDrafts(active?.triggers));
    setSelectedIdx(0);
    setRecording(false);
    setPickerOpen(false);
    setMatchPicker(null);
    setModifierPicker(null);
    setCaptureError(null);
  }

  async function save() {
    if (!active) return;
    setSaving(true);
    try {
      const updated: Profile = { ...active, triggers: cleanTriggers };
      await invoke("profile_save", { profile: updated });
      const list = await invoke<Profile[]>("profile_list");
      useProfileStore.getState().setProfiles(list);
    } finally {
      setSaving(false);
    }
  }

  return {
    active,
    draftTriggers,
    selectedIdx: sel,
    selected,
    selectedChips,
    selectedMain,
    assignedMains,
    cleanTriggers,
    dropReport,
    willDropCard,
    dirty,
    recording,
    pickerOpen,
    openMenuIdx,
    matchPicker,
    modifierPicker,
    saving,
    shortcutError: captureError ?? duplicateConflict,
    flashAction,
    selectTriggerAt,
    patchSelected,
    addTrigger,
    openEmptyOn,
    mapKeyDown,
    createOnMain,
    pressKey,
    duplicateTrigger,
    deleteTrigger,
    removeSelected,
    setSingleAction,
    clearSelectedShortcut,
    focusActionStep,
    selectActionType,
    toggleMenu: (idx: number) =>
      setOpenMenuIdx(openMenuIdx === idx ? null : idx),
    setPickerOpen,
    setMatchPicker,
    setModifierPicker,
    startRecording,
    openPicker,
    applyPickerShortcut,
    discardChanges,
    save,
  };
}