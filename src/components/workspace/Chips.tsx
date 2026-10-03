import { keyChipLabel } from "../../lib/keymap";

export default function Chips({ parts }: { parts: string[] }) {
  if (parts.length === 0)
    return <span className="trigger-empty-hint">No shortcut set</span>;
  return (
    <span className="chips-wrapper">
      {parts.map((c, i) => (
        <span key={`${c}-${i}`} className="kbd-row">
          {i > 0 && <span className="kbd-plus">+</span>}
          <kbd className={`kbd ${i === parts.length - 1 ? "kbd-last" : ""}`}>
            {keyChipLabel(c)}
          </kbd>
        </span>
      ))}
    </span>
  );
}
