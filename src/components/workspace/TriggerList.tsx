import { Ban, Copy, Ellipsis, Eye, Keyboard, Plus, Trash2 } from "lucide-react";
import { parseTrigger } from "../../lib/keys";
import type { Macro, MacroAction, Trigger } from "../../types";
import Chips from "./Chips";

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
  openMenuIdx: number | null;
  onSelect: (idx: number) => void;
  onToggleEnabled: (idx: number) => void;
  onFocusAction: (idx: number) => void;
  onDuplicate: (idx: number) => void;
  onToggleBlock: (idx: number) => void;
  onDelete: (idx: number) => void;
  onToggleMenu: (idx: number) => void;
  onAdd: () => void;
}

export default function TriggerList({
  triggers,
  selectedIdx,
  recording,
  macros,
  openMenuIdx,
  onSelect,
  onToggleEnabled,
  onFocusAction,
  onDuplicate,
  onToggleBlock,
  onDelete,
  onToggleMenu,
  onAdd,
}: TriggerListProps) {
  return (
    <>
      <div className="trigger-card-list">
        {triggers.map((t, i) => {
          const preview = actionPreviewLabel(t.actions[0], macros);
          const menuOpen = openMenuIdx === i;
          return (
            <div
              key={`${i}-${t.shortcut}`}
              className={`trigger-card ${i === selectedIdx ? "trigger-card-selected" : ""} ${
                recording && i === selectedIdx ? "trigger-card-recording" : ""
              } ${t.enabled ? "" : "trigger-card-off"}`}
              onClick={() => onSelect(i)}
              title="Click to select trigger"
            >
              <div className="trigger-card-left">
                <div className="trigger-icon">
                  <Keyboard aria-hidden="true" />
                </div>
                <div className="trigger-card-content">
                  <div className="trigger-chips">
                    {recording && i === selectedIdx ? (
                      <span className="trigger-recording-hint">
                        Press a key or shortcut… (Esc to cancel)
                      </span>
                    ) : (
                      <Chips parts={parseTrigger(t.shortcut)} />
                    )}
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
                  className={`trigger-pass ${t.block_key ? "trigger-pass-block" : ""}`}
                >
                  {t.block_key ? <Ban aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={t.enabled}
                  aria-label={t.enabled ? "Disable trigger" : "Enable trigger"}
                  title={t.enabled ? "Disable trigger" : "Enable trigger"}
                  className={`switch switch-sm ${t.enabled ? "switch-on" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleEnabled(i);
                  }}
                >
                  <span className="switch-thumb" />
                </button>
                <div className="trigger-menu-wrap">
                  <button
                    type="button"
                    className="rail-dots"
                    aria-label="Trigger options"
                    title="Options"
                    aria-expanded={menuOpen}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMenu(i);
                    }}
                  >
                    <Ellipsis aria-hidden="true" />
                  </button>
                  {menuOpen && (
                    <div
                      className="rail-menu"
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
                      <button
                        type="button"
                        className="rail-menu-item"
                        onClick={() => onToggleBlock(i)}
                      >
                        {t.block_key ? "Unblock original key" : "Block original key"}
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