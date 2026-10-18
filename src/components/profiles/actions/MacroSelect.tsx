import { useProfileStore } from "../../../stores/useProfileStore";

export default function MacroSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (macroId: string) => void;
}) {
  const macros = useProfileStore((s) => s.macros);
  const known = macros.some((m) => m.id === value);

  return (
    <div className="action-card">
      <div className="custom-select-wrap">
        <select
          className="custom-select"
          value={known ? value : ""}
          aria-label="Select macro"
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select macro…</option>
          {macros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name || "(unnamed)"}
            </option>
          ))}
        </select>
        {value !== "" && !known && (
          <span className="inline-warn">
            This macro was deleted. Pick another one.
          </span>
        )}
        {macros.length === 0 && (
          <span className="settings-setting-desc">
            No macros yet — create one in Macros.
          </span>
        )}
      </div>
    </div>
  );
}
