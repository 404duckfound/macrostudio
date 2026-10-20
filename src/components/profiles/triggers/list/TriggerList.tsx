import { useState } from "react";
import {
  AlertTriangle,
  Anchor,
  ArrowUp,
  Asterisk,
  Ban,
  Copy,
  Ellipsis,
  Eye,
  Keyboard,
  Layers,
  Mouse,
  Plus,
  Trash2,
} from "lucide-react";
import { parseTrigger } from "../../../../lib/keys";
import { splitCombo } from "../../../../lib/keyCatalog";
import type { Layer, Macro, MacroAction, Trigger } from "../../../../types";
import Chips from "../fields/Chips";

function actionPreviewLabel(
  action: MacroAction | null | undefined,
  macros: Macro[],
): string | null {
  if (!action) return null;
  switch (action.type) {
    case "key":
      return action.key ? `Key: ${action.key}` : "Key: (empty)";
    case "mouse":
      return `Mouse: ${action.button}`;
    case "macro": {
      if (!action.macro_id) return "Macro: (empty)";
      const found = macros.find((m) => m.id === action.macro_id);
      return found ? `Macro: ${found.name || "(unnamed)"}` : "Macro: (deleted)";
    }
    case "script":
      return "AHK Script";
  }
}

interface TriggerListProps {
  triggers: Trigger[];
  selectedIdx: number;
  recording: boolean;
  macros: Macro[];
  /** The profile's layers, for the badge on the cards. */
  layers: Layer[];
  openMenuIdx: number | null;
  /** Draft indices whose shortcut repeats an earlier card; save omits them. */
  duplicateIndices: number[];
  onSelect: (idx: number) => void;
  onFocusAction: (idx: number) => void;
  onDuplicate: (idx: number) => void;
  onDelete: (idx: number) => void;
  onToggleMenu: (idx: number) => void;
  onAdd: () => void;
}

export default function TriggerList({
  triggers,
  selectedIdx,
  recording,
  macros,
  layers,
  openMenuIdx,
  duplicateIndices,
  onSelect,
  onFocusAction,
  onDuplicate,
  onDelete,
  onToggleMenu,
  onAdd,
}: TriggerListProps) {
  // Fixed position from the "..." button's rect, matching the profile
  // selector's option menu (.rail-menu-inline): the card list is a scroll
  // container, so an absolutely positioned menu would be clipped by it.
  const [menuAnchor, setMenuAnchor] = useState<{
    top: number;
    left: number;
  } | null>(null);

  return (
    <>
      <div className="trigger-card-list">
        {triggers.map((t, i) => {
          const preview = actionPreviewLabel(t.actions[0], macros);
          const menuOpen = openMenuIdx === i;
          const duplicate = duplicateIndices.includes(i);
          const main = splitCombo(t.shortcut).main;
          const mouseTrigger = main?.startsWith("Mouse") ?? false;
          return (
            <div
              key={`${i}-${t.shortcut}`}
              className={`trigger-card ${i === selectedIdx ? "trigger-card-selected" : ""} ${
                recording && i === selectedIdx ? "trigger-card-recording" : ""
              } ${duplicate ? "trigger-card-duplicate" : ""}`}
              onClick={() => onSelect(i)}
              title="Click to select trigger"
            >
              <div className="trigger-card-left">
                <div className="trigger-icon">
                  {mouseTrigger ? (
                    <Mouse aria-hidden="true" />
                  ) : (
                    <Keyboard aria-hidden="true" />
                  )}
                </div>
                <div className="trigger-card-content">
                  <div className="trigger-card-body">
                    <div className="trigger-flags">
                      <span
                        role="img"
                        aria-label={
                          t.block_key
                            ? "Original keypress is blocked by Macro Studio"
                            : "Original keypress passes through to active app"
                        }
                        data-tip={
                          t.block_key
                            ? "Blocked — Macro Studio swallows the keypress"
                            : "Pass-through — the keypress reaches the active app (~)"
                        }
                        className={`trigger-flag ${
                          t.block_key ? "trigger-flag-block" : ""
                        }`}
                      >
                        {t.block_key ? (
                          <Ban aria-hidden="true" />
                        ) : (
                          <Eye aria-hidden="true" />
                        )}
                      </span>
                      {t.fire_on_release && (
                        <span
                          role="img"
                          aria-label="Fires on key release"
                          data-tip="Fires on key release"
                          className="trigger-flag"
                        >
                          <ArrowUp aria-hidden="true" />
                        </span>
                      )}
                      {t.wildcard && (
                        <span
                          role="img"
                          aria-label="Wildcard: also fires with extra modifiers held"
                          data-tip="Wildcard — also fires with extra modifiers held"
                          className="trigger-flag"
                        >
                          <Asterisk aria-hidden="true" />
                        </span>
                      )}
                      {t.force_hook && (
                        <span
                          role="img"
                          aria-label="Keyboard hook forced"
                          data-tip="Keyboard hook forced"
                          className="trigger-flag"
                        >
                          <Anchor aria-hidden="true" />
                        </span>
                      )}
                      {duplicate && (
                        <span
                          role="status"
                          data-tip="Save omits this card: another trigger already uses this shortcut"
                          className="trigger-dup-chip"
                        >
                          <AlertTriangle aria-hidden="true" />
                          Duplicate shortcut
                        </span>
                      )}
                      {t.layer && (
                        <span
                          className="trigger-layer-chip"
                          data-tip={`This trigger only fires while ${
                            layers.find((l) => l.id === t.layer)?.activator ??
                            "the layer key"
                          } is held`}
                        >
                          <Layers aria-hidden="true" />
                          {layers.find((l) => l.id === t.layer)?.name ??
                            "Layer"}
                        </span>
                      )}
                    </div>
                    <div className="trigger-chips">
                      {recording && i === selectedIdx ? (
                        <span className="trigger-recording-hint">
                          Press a key or shortcut… (Esc to cancel)
                        </span>
                      ) : (
                        <Chips parts={parseTrigger(t.shortcut)} />
                      )}
                    </div>
                  </div>
                  {preview ? (
                    <span className="trigger-action-pill">{preview}</span>
                  ) : (
                    <button
                      type="button"
                      className="trigger-noaction-btn"
                      title="Assign an action to this trigger"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFocusAction(i);
                      }}
                    >
                      + Assign action
                    </button>
                  )}
                </div>
              </div>
              <div className="trigger-card-right">
                <div className="trigger-menu-wrap">
                  <button
                    type="button"
                    className="rail-dots"
                    aria-label="Trigger options"
                    title="Options"
                    aria-expanded={menuOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      const r = e.currentTarget.getBoundingClientRect();
                      setMenuAnchor({ top: r.bottom + 4, left: r.right });
                      onToggleMenu(i);
                    }}
                  >
                    <Ellipsis aria-hidden="true" />
                  </button>
                  {menuOpen && menuAnchor && (
                    <div
                      className="rail-menu rail-menu-inline"
                      style={{
                        top: menuAnchor.top,
                        left: menuAnchor.left,
                        right: "auto",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleMenu(i);
                      }}
                    >
                      <button
                        type="button"
                        className="rail-menu-item"
                        onClick={() => onDuplicate(i)}
                      >
                        <Copy className="rail-menu-icon" aria-hidden="true" />
                        Duplicate
                      </button>
                      <div className="rail-menu-divider" />
                      <button
                        type="button"
                        className="rail-menu-item rail-menu-item-danger"
                        onClick={() => onDelete(i)}
                      >
                        <Trash2 className="rail-menu-icon" aria-hidden="true" />
                        Delete Trigger
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className="trigger-add-placeholder" onClick={onAdd}>
        <Plus aria-hidden="true" />
        <span>Add new trigger</span>
      </button>
    </>
  );
}
