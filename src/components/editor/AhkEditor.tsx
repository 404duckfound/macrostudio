import Editor from "@monaco-editor/react";
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useProfileStore } from "../../stores/useProfileStore";

export default function AhkEditor() {
  const { activeId, profiles } = useProfileStore();
  const [code, setCode] = useState("; select a profile");
  const active = profiles.find((p) => p.id === activeId);

  useEffect(() => {
    if (!active) return;
    invoke<string>("ahk_compile_preview", { trigger: active.trigger, actions: active.actions })
      .then(setCode)
      .catch(console.error);
  }, [active]);

  return (
    <div style={{ height: "100%" }}>
      <Editor
        height="100%"
        language="ini"
        theme="vs-dark"
        value={code}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          readOnly: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 0 },
        }}
      />
    </div>
  );
}
