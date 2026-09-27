export default function Chips({ parts }: { parts: string[] }) {
  if (parts.length === 0)
    return <span className="trigger-recording-hint">No shortcut set</span>;
  return (
    <>
      {parts.map((c, i) => (
        <span key={`${c}-${i}`} className="kbd-row">
          {i > 0 && <span className="kbd-plus">+</span>}
          <kbd className={`kbd ${i === parts.length - 1 ? "kbd-last" : ""}`}>
            {c}
          </kbd>
        </span>
      ))}
    </>
  );
}
