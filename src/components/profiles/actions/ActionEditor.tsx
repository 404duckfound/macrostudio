import { CodeXml } from "lucide-react";
import type { MacroAction } from "../../../types";
import KeyActionEditor from "./KeyActionEditor";
import { MouseInput } from "./MouseInput";
import MacroSelect from "./MacroSelect";

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
            autoComplete="off"
            onChange={(e) => onChange({ type: "script", code: e.target.value })}
          />
        </div>
      </div>
    );
  }

  if (action.type === "macro") {
    return (
      <MacroSelect
        value={action.macro_id}
        onChange={(macro_id) => onChange({ type: "macro", macro_id })}
      />
    );
  }

  return null;
}
