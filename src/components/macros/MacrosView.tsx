import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Trash2 } from "lucide-react";
import { useProfileStore } from "../../stores/useProfileStore";
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
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saved = macros.find((m) => m.id === selectedId) ?? null;
  const dirty =
    draft !== null &&
    saved !== null &&
    JSON.stringify(draft) !== JSON.stringify(saved);

  function select(id: string) {
    setSelectedId(id);
    const found = macros.find((m) => m.id === id) ?? null;
    setDraft(found ? { ...found, blocks: found.blocks.map((b) => ({ ...b })) } : null);
    setConfirmDelete(false);
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
      setConfirmDelete(false);
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
      kind === "keys"
        ? { kind: "keys", keys: "" }
        : kind === "mouse"
          ? { kind: "mouse", button: "Left", x: 0, y: 0 }
          : { kind: "delay", ms: 500 };
    setDraft({ ...draft, blocks: [...draft.blocks, block] });
  }

  // Deleting a macro empties every trigger that referenced it; the triggers
  // themselves stay, with empty actions.
  async function deleteSelected() {
    if (!selectedId) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setConfirmDelete(false);
    setSaving(true);
    try {
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
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="workspace settings-workspace">
      <div className="flow-canvas">
        <div className="settings-container">
          <div className="settings-header">
            <h2 className="settings-title">Macros</h2>
            <p className="settings-subtitle">
              Reusable key, mouse, and delay sequences. Triggers run them by reference.
            </p>
          </div>

          <div className="settings-section-card">
            <div className="macro-layout">
              <div className="macro-list-pane">
                <button
                  type="button"
                  className="btn-secondary macro-add-btn"
                  onClick={addMacro}
                  disabled={saving}
                >
                  <Plus className="btn-icon-sm" aria-hidden="true" />
                  <span>New macro</span>
                </button>
                <div className="macro-list" role="listbox" aria-label="Macros">
                  {macros.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="option"
                      aria-selected={m.id === selectedId}
                      className={`macro-item ${m.id === selectedId ? "macro-item-selected" : ""}`}
                      onClick={() => select(m.id)}
                    >
                      <span className="macro-item-name">{m.name || "(unnamed)"}</span>
                      <span className="macro-item-count">{blockCountLabel(m.blocks.length)}</span>
                    </button>
                  ))}
                  {macros.length === 0 && (
                    <p className="settings-setting-desc">No macros yet.</p>
                  )}
                </div>
              </div>

              <div className="macro-editor">
                {!draft ? (
                  <p className="settings-setting-desc">
                    Select a macro to edit its blocks, or create a new one.
                  </p>
                ) : (
                  <>
                    <input
                      value={draft.name}
                      aria-label="Macro name"
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      placeholder="Macro name"
                    />
                    <div className="macro-add-row">
                      <select
                        value=""
                        aria-label="Add block"
                        onChange={(e) => {
                          const kind = e.target.value as ActionBlock["kind"];
                          if (kind) addBlock(kind);
                        }}
                      >
                        <option value="">Add block…</option>
                        <option value="keys">Keys / Text</option>
                        <option value="mouse">Mouse Click</option>
                        <option value="delay">Pause / Delay</option>
                      </select>
                    </div>
                    {draft.blocks.length === 0 ? (
                      <p className="settings-setting-desc">
                        No blocks yet — add keys, mouse clicks, or delays above.
                      </p>
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
                      <button
                        type="button"
                        className="btn-ghost macro-delete-btn"
                        onClick={deleteSelected}
                        disabled={saving}
                      >
                        <Trash2 className="btn-icon-sm" aria-hidden="true" />
                        <span>{confirmDelete ? "Click again to confirm" : "Delete"}</span>
                      </button>
                      <button
                        type="button"
                        className="btn-primary macro-save-btn"
                        onClick={saveDraft}
                        disabled={saving || !dirty}
                      >
                        <span>Save</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
