export default function BlockKeyToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="block-card">
      <div>
        <span className="toggle-title">Block Original Keypress</span>
        <span className="toggle-sub">Suppress OS key event pass-through</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        className={`switch ${value ? "switch-on" : ""}`}
        onClick={() => onChange(!value)}
      >
        <span className="switch-thumb" />
      </button>
    </div>
  );
}
