import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Boxes, Plus, Save } from "lucide-react";
import { useProfileStore } from "../../stores/useProfileStore";
import MacroHeader from "./MacroHeader";
import type { ActionBlock, Macro, Profile } from "../../types";
import BlockRow from "../workspace/actions/BlockRow";

function blankMacro(): Macro {
  return { id: crypto.randomUUID(), name: "New macro", blocks: [] };
}

function blockCountLabel(n: number): string {
  return `${n} ${n === 1 ? "block" : "blocks"}`;
}

export default function MacrosView() {
  const macros = useProfileStore((s) => s.macros);
  const setMacros = useProfileStore((s) => s.setMacros);
  const profiles = useProfileStore((s) => s.profiles);
  const setProfiles = useProfileStore((s) => s.setProfiles);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Macro | null>(null);
  const [saving, setSaving] = useState(false);

  const saved = macros.find((m) => m.id === selectedId) ?? null;
  const dirty =
    draft !== null &&
    saved !== null &&
    JSON.stringify(draft) !== JSON.stringify(saved);

  function select(id: string) {
    setSelectedId(id);
    const found = macros.find((m) => m.id === id) ?? null;
    setDraft(found ? { ...found, blocks: found.blocks.map((b) => ({ ...b })) } : null);
  }

  async function refreshMacros(): Promise<void> {
    setMacros(await invoke<Macro[]>("macro_list"));
  }

  async function addMacro() {
    const macro = blankMacro();
    setSaving(true);
    try {
      await invoke("macro_save", { macroItem: macro });
      await refreshMacros();
      // select() would read the stale pre-save list here, so wire the
      // freshly created macro directly instead.
      setSelectedId(macro.id);
      setDraft({ ...macro, blocks: [] });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    const trimmed = { ...draft, name: draft.name.trim() || "(unnamed)" };
    setSaving(true);
    try {
      await invoke("macro_save", { macroItem: trimmed });
      await refreshMacros();
      setDraft(trimmed);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function addBlock(kind: ActionBlock["kind"]) {
    if (!draft) return;
    const block: ActionBlock =
      kind === "mouse"
        ? { kind: "mouse", button: "Left", x: 0, y: 0 }
        : { kind: "delay", ms: 500 };
    setDraft({ ...draft, blocks: [...draft.blocks, block] });
  }

  // Deleting a macro empties every trigger that referenced it; the triggers
  // themselves stay, with empty actions.
  async function deleteSelected() {
    if (!selectedId) throw new Error("No macro selected");
    for (const p of profiles) {
      if (!p.triggers.some((t) => t.actions.some((a) => a.type === "macro" && a.macro_id === selectedId))) {
        continue;
      }
      const updated = {
        ...p,
        triggers: p.triggers.map((t) => ({
          ...t,
          actions: t.actions.filter(
            (a) => !(a.type === "macro" && a.macro_id === selectedId),
          ),
        })),
      };
      await invoke("profile_save", { profile: updated });
    }
    await invoke("macro_delete", { macroId: selectedId });
    setProfiles(await invoke<Profile[]>("profile_list"));
    await refreshMacros();
    setSelectedId(null);
    setDraft(null);
  }

  return (
    <main className="workspace">
      <div className="flow-canvas">
        {!draft ? (
          <div className="flow-canvas-empty">
            <div className="workspace-empty-state">
              <div className="workspace-empty-icon">
                <Boxes aria-hidden="true" />
              </div>
              <h3>{macros.length === 0 ? "No Macros Yet" : "No Macro Selected"}</h3>
              <p>
                {macros.length === 0
                  ? "Macros are reusable block lists — mouse clicks, pauses — that triggers can run."
                  : "Pick a macro to edit its blocks, or create a new one."}
              </p>
              <button
                className="btn-primary"
                type="button"
                disabled={saving}
                onClick={() => void addMacro()}
              >
                <Plus aria-hidden="true" />
                <span>Create Macro</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="macro-editor">
            <MacroHeader
              selectedId={selectedId}
              draft={draft}
              dirty={dirty}
              saving={saving}
              onSelect={select}
              onChange={setDraft}
              onCreate={() => void addMacro()}
              onDelete={deleteSelected}
            />

            <div className="macro-add-row">
              <select
                value=""
                aria-label="Add block"
                onChange={(e) => {
                  const kind = e.target.value as ActionBlock["kind"];
                  if (kind) addBlock(kind);
                  e.target.value = "";
                }}
              >
                <option value="">Add block…</option>
                <option value="mouse">Mouse Click</option>
                <option value="delay">Pause / Delay</option>
              </select>
            </div>
            {draft.blocks.length === 0 ? (
              <p className="settings-setting-desc">No blocks yet — add keys, mouse clicks, or delays above.</p>
            ) : (
              <div className="macro-blocks-list">
                {draft.blocks.map((b, i) => (
                  <BlockRow
                    key={i}
                    block={b}
                    onChange={(next) =>
                      setDraft({
                        ...draft,
                        blocks: draft.blocks.map((old, j) => (j === i ? next : old)),
                      })
                    }
                    onDelete={() =>
                      setDraft({
                        ...draft,
                        blocks: draft.blocks.filter((_, j) => j !== i),
                      })
                    }
                  />
                ))}
              </div>
            )}
            <div className="macro-footer">
              <span className="macro-footer-count">{blockCountLabel(draft.blocks.length)}</span>
              <button
                type="button"
                className="btn-primary macro-save-btn"
                onClick={() => void saveDraft()}
                disabled={saving || !dirty}
              >
                <Save aria-hidden="true" />
                <span>Save</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}