import { Clock, CodeXml, Mouse, Plus, Type } from "lucide-react";
import type { MacroAction } from "../../../types";
import KeyActionEditor from "./KeyActionEditor";
import { KeysInput } from "./KeysInput";
import { MouseInput } from "./MouseInput";
import BlockRow from "./BlockRow";

export default function ActionEditor({
  action,
  onChange,
}: {
  action: MacroAction;
  onChange: (a: MacroAction) => void;
}) {
  if (action.type === "key") {
    return (
      <div className="action-card">
        <KeyActionEditor action={action} onChange={onChange} />
      </div>
    );
  }

  if (action.type === "keys") {
    return (
      <div className="action-card">
        <KeysInput
          keys={action.keys}
          onKeys={(keys) => onChange({ type: "keys", keys })}
        />
      </div>
    );
  }

  if (action.type === "mouse") {
    return (
      <div className="action-card">
        <MouseInput
          button={action.button}
          x={action.x}
          y={action.y}
          onPatch={(patch) => onChange({ ...action, ...patch })}
        />
      </div>
    );
  }

  if (action.type === "script") {
    return (
      <div className="action-card">
        <div className="script-editor-wrap">
          <div className="script-head">
            <div className="script-head-left">
              <CodeXml className="script-icon" aria-hidden="true" />
              <span className="script-lang-badge">AutoHotkey v2</span>
            </div>
            <span className="script-hint">Direct script execution</span>
          </div>
          <textarea
            className="action-textarea"
            value={action.code}
            placeholder={'// Raw AutoHotkey v2 code\nSend("Hello from Macro Studio{Enter}")'}
            spellCheck={false}
            onChange={(e) => onChange({ type: "script", code: e.target.value })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="action-card custom-action-container">
      <CustomBlocks action={action} onChange={onChange} />
    </div>
  );
}

function CustomBlocks({
  action,
  onChange,
}: {
  action: Extract<MacroAction, { type: "custom" }>;
  onChange: (a: MacroAction) => void;
}) {
  function setBlocks(
    blocks: Extract<MacroAction, { type: "custom" }>["blocks"],
  ) {
    onChange({ type: "custom", blocks });
  }

  return (
    <div className="custom-blocks-wrapper">
      {action.blocks.length === 0 ? (
        <div className="custom-blocks-empty">
          <span>No sequence blocks configured yet.</span>
          <span className="custom-blocks-empty-sub">
            Add keys, mouse clicks, or delays below to create a multi-step macro.
          </span>
        </div>
      ) : (
        <div className="custom-blocks-list">
          {action.blocks.map((b, i) => (
            <BlockRow
              key={i}
              block={b}
              onChange={(next) =>
                setBlocks(action.blocks.map((old, j) => (j === i ? next : old)))
              }
              onDelete={() => setBlocks(action.blocks.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      )}

      <div className="block-add-row">
        <button
          type="button"
          className="btn-add-block"
          onClick={() =>
            setBlocks([...action.blocks, { kind: "keys", keys: "" }])
          }
        >
          <Plus className="btn-add-icon" aria-hidden="true" />
          <Type className="btn-add-icon" aria-hidden="true" />
          <span>Keys</span>
        </button>
        <button
          type="button"
          className="btn-add-block"
          onClick={() =>
            setBlocks([
              ...action.blocks,
              { kind: "mouse", button: "Left", x: 0, y: 0 },
            ])
          }
        >
          <Plus className="btn-add-icon" aria-hidden="true" />
          <Mouse className="btn-add-icon" aria-hidden="true" />
          <span>Mouse</span>
        </button>
        <button
          type="button"
          className="btn-add-block"
          onClick={() =>
            setBlocks([...action.blocks, { kind: "delay", ms: 500 }])
          }
        >
          <Plus className="btn-add-icon" aria-hidden="true" />
          <Clock className="btn-add-icon" aria-hidden="true" />
          <span>Delay</span>
        </button>
      </div>
    </div>
  );
}
