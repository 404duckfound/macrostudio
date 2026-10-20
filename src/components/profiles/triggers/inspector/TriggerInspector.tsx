import {
  AlertCircle,
  Plus,
  Save,
  SlidersHorizontal,
  Trash2,
  Undo2,
} from "lucide-react";
import type { Layer, MacroAction, Trigger } from "../../../../types";
import ActionEditor from "../../actions/ActionEditor";
import ActionTypeCard from "../../actions/ActionTypeCard";
import LayerSelect from "../fields/LayerSelect";
import ShortcutField from "../fields/ShortcutField";
import TriggerModifiers from "../fields/TriggerModifiers";

interface TriggerInspectorProps {
  selected: Trigger | undefined;
  selectedIdx: number;
  selectedChips: string[];
  single: MacroAction | null;
  /** The profile's layers, for the layer picker. */
  layers: Layer[];
  dirty: boolean;
  saving: boolean;
  recording: boolean;
  pickerOpen: boolean;
  willDropCard: boolean;
  flashAction: boolean;
  shortcutError: string | null;
  onStartRecording: () => void;
  onPickerOpen: () => void;
  onPickerSelect: (combo: string) => void;
  onPickerClose: () => void;
  onClearShortcut: () => void;
  onPatchSelected: (patch: (t: Trigger) => Trigger) => void;
  onSelectActionType: (kind: MacroAction["type"]) => void;
  onSetSingleAction: (next: MacroAction | null) => void;
  onSave: () => void;
  onDiscard: () => void;
  onRemoveSelected: () => void;
  onAddTrigger: () => void;
}

export default function TriggerInspector(props: TriggerInspectorProps) {
  const {
    selected,
    selectedIdx,
    selectedChips,
    single,
    layers,
    dirty,
    saving,
    recording,
    pickerOpen,
    willDropCard,
    flashAction,
    shortcutError,
    onStartRecording,
    onPickerOpen,
    onPickerSelect,
    onPickerClose,
    onClearShortcut,
    onPatchSelected,
    onSelectActionType,
    onSetSingleAction,
    onSave,
    onDiscard,
    onRemoveSelected,
    onAddTrigger,
  } = props;

  return (
    <aside className="inspector">
      <div className="inspector-head">
        <div className="inspector-head-left">
          <h3>Trigger Inspector</h3>
        </div>
        {dirty && <span className="inspector-dirty-tag">Modified</span>}
      </div>

      {selected ? (
        <>
          <div className="inspector-body">
            <section className="step-card" aria-label="Step 1: When">
              <div className="step-head">
                <span className="step-num" aria-hidden="true">
                  1
                </span>
                <span className="step-title">When</span>
                {selectedChips.length > 0 && (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={onClearShortcut}
                  >
                    Clear
                  </button>
                )}
              </div>
              <ShortcutField
                parts={selectedChips}
                combo={selected.shortcut}
                recording={recording}
                pickerOpen={pickerOpen}
                onRecord={onStartRecording}
                onPickerOpen={onPickerOpen}
                onPickerSelect={onPickerSelect}
                onPickerClose={onPickerClose}
                error={shortcutError}
              />
              <div className="inspector-layer-row">
                <span className="inspector-layer-label">Layer</span>
                <LayerSelect
                  value={selected.layer ?? null}
                  layers={layers}
                  onChange={(layerId) =>
                    onPatchSelected((t) => ({ ...t, layer: layerId }))
                  }
                />
              </div>
              {willDropCard && (
                <div className="inline-warn" role="alert">
                  <AlertCircle className="warn-icon" aria-hidden="true" />
                  <span>
                    A trigger has an empty or duplicated shortcut, or no action
                    yet. It will be omitted on save.
                  </span>
                </div>
              )}
            </section>

            <section className="step-card" aria-label="Step 2: Modifiers">
              <TriggerModifiers
                key={selectedIdx}
                trigger={selected}
                onPatch={onPatchSelected}
                stepNum={2}
              />
            </section>

            <section
              className={`step-card ${flashAction ? "step-flash" : ""}`}
              aria-label="Step 3: Action"
              id="inspector-step-action"
            >
              <div className="step-head">
                <span className="step-num" aria-hidden="true">
                  3
                </span>
                <span className="step-title">Action</span>
                {single && (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => onSetSingleAction(null)}
                  >
                    Clear
                  </button>
                )}
              </div>
              <ActionTypeCard
                value={single?.type ?? ""}
                onSelect={(kind) => {
                  if (kind === "") onSetSingleAction(null);
                  else onSelectActionType(kind);
                }}
              />
              {single?.type === "key" && single.key.length === 0 && (
                <div className="inline-warn">
                  <AlertCircle className="warn-icon" aria-hidden="true" />
                  <span>
                    Pick a key target, otherwise this trigger will execute nothing.
                  </span>
                </div>
              )}
              {!single && (
                <div className="inline-warn">
                  <AlertCircle className="warn-icon" aria-hidden="true" />
                  <span>No action selected — this trigger will execute nothing.</span>
                </div>
              )}
              {single && (
                <ActionEditor action={single} onChange={onSetSingleAction} />
              )}
            </section>
            <div className="inspector-scroll-fade" aria-hidden="true" />
          </div>

          <div className="inspector-foot">
            <button
              type="button"
              className={`btn-trigger-save ${dirty ? "btn-trigger-save-dirty" : ""}`}
              onClick={onSave}
              disabled={saving || !dirty}
              title={dirty ? "Save changes to profile" : "No changes to save"}
            >
              {dirty && !saving && <span className="save-dot" aria-hidden="true" />}
              <Save aria-hidden="true" />
              <span>{saving ? "Saving…" : "Save Changes"}</span>
            </button>
            <button
              type="button"
              className="btn-trigger-undo"
              onClick={onDiscard}
              disabled={!dirty || saving}
              title={dirty ? "Discard unsaved changes" : "No unsaved changes"}
              aria-label="Discard unsaved changes"
            >
              <Undo2 aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn-trigger-delete"
              onClick={onRemoveSelected}
              disabled={!selected}
              title="Delete this trigger"
              aria-label="Delete this trigger"
            >
              <Trash2 aria-hidden="true" />
            </button>
          </div>
        </>
      ) : (
        <div className="inspector-empty-state">
          <div className="inspector-empty-icon">
            <SlidersHorizontal aria-hidden="true" />
          </div>
          <h4>No Trigger Selected</h4>
          <p>
            Select a trigger card from the canvas to edit its shortcut key and
            macro actions, or add a new trigger.
          </p>
          <button
            type="button"
            className="btn-secondary inspector-empty-btn"
            onClick={onAddTrigger}
          >
            <Plus aria-hidden="true" />
            <span>Add Trigger</span>
          </button>
        </div>
      )}
    </aside>
  );
}