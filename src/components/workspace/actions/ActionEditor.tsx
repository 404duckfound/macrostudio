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
        <textarea
          className="action-textarea"
          value={action.code}
          placeholder={'Raw AHK v2, e.g.\nSend("hello")'}
          spellCheck={false}
          onChange={(e) => onChange({ type: "script", code: e.target.value })}
        />
      </div>
    );
  }

  return (
    <div className="action-card">
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
    <>
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
      <div className="block-add-row">
        <button
          type="button"
          onClick={() =>
            setBlocks([...action.blocks, { kind: "keys", keys: "" }])
          }
        >
          + Keys
        </button>
        <button
          type="button"
          onClick={() =>
            setBlocks([
              ...action.blocks,
              { kind: "mouse", button: "Left", x: 0, y: 0 },
            ])
          }
        >
          + Mouse
        </button>
        <button
          type="button"
          onClick={() =>
            setBlocks([...action.blocks, { kind: "delay", ms: 500 }])
          }
        >
          + Delay
        </button>
      </div>
    </>
  );
}
