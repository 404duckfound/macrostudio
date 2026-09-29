import type { ActionBlock } from "../../types";
import { KeysInput } from "./keysInput";
import { MouseInput } from "./mouseInput";

const BLOCK_LABELS: Record<ActionBlock["kind"], string> = {
  keys: "Keys",
  mouse: "Mouse",
  delay: "Delay",
};

/// `custom` aksiyonundaki tek bir blok: tur etiketi, ona uygun alan ve silme.
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
    <div className="block-row">
      <span className="block-kind">{BLOCK_LABELS[block.kind]}</span>
      {block.kind === "keys" && (
        <KeysInput
          keys={block.keys}
          onKeys={(keys) => onChange({ kind: "keys", keys })}
        />
      )}
      {block.kind === "delay" && (
        <input
          type="number"
          min={0}
          value={block.ms}
          aria-label="Delay milliseconds"
          onChange={(e) =>
            onChange({ kind: "delay", ms: Number(e.target.value) || 0 })
          }
        />
      )}
      {block.kind === "mouse" && (
        <MouseInput
          button={block.button}
          x={block.x}
          y={block.y}
          onPatch={(patch) => onChange({ ...block, ...patch })}
        />
      )}
      <button
        type="button"
        className="action-delete"
        onClick={onDelete}
        title="Delete block"
      >
        ×
      </button>
    </div>
  );
}
