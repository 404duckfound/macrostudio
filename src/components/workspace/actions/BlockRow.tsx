import { Clock, Mouse, Trash2, Type } from "lucide-react";
import type { ActionBlock } from "../../../types";
import { KeysInput } from "./KeysInput";
import { MouseInput } from "./MouseInput";

function BlockIcon({ kind }: { kind: ActionBlock["kind"] }) {
  if (kind === "keys") return <Type className="block-icon" aria-hidden="true" />;
  if (kind === "mouse") return <Mouse className="block-icon" aria-hidden="true" />;
  return <Clock className="block-icon" aria-hidden="true" />;
}

const BLOCK_LABELS: Record<ActionBlock["kind"], string> = {
  keys: "Keys / Text",
  mouse: "Mouse Click",
  delay: "Pause / Delay",
};

export default function BlockRow({
  block,
  onChange,
  onDelete,
}: {
  block: ActionBlock;
  onChange: (b: ActionBlock) => void;
  onDelete: () => void;
}) {
  return (
    <div className="custom-block-card">
      <div className="custom-block-head">
        <div className="custom-block-badge">
          <BlockIcon kind={block.kind} />
          <span className="custom-block-kind">{BLOCK_LABELS[block.kind]}</span>
        </div>
        <button
          type="button"
          className="custom-block-delete"
          onClick={onDelete}
          title="Delete block"
          aria-label="Delete block"
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>

      <div className="custom-block-body">
        {block.kind === "keys" && (
          <KeysInput
            keys={block.keys}
            onKeys={(keys) => onChange({ kind: "keys", keys })}
          />
        )}
        {block.kind === "delay" && (
          <div className="delay-input-row">
            <span className="delay-label">Wait time:</span>
            <div className="delay-field">
              <input
                type="number"
                min={0}
                max={60000}
                step={50}
                className="delay-input"
                value={block.ms}
                aria-label="Delay milliseconds"
                onChange={(e) =>
                  onChange({ kind: "delay", ms: Number(e.target.value) || 0 })
                }
              />
              <span className="delay-unit">ms</span>
            </div>
          </div>
        )}
        {block.kind === "mouse" && (
          <MouseInput
            button={block.button}
            x={block.x}
            y={block.y}
            onPatch={(patch) => onChange({ ...block, ...patch })}
          />
        )}
      </div>
    </div>
  );
}
