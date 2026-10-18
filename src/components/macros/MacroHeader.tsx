import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Pencil } from "lucide-react";
import { useProfileStore } from "../../stores/useProfileStore";
import SelectMenu from "../common/ui/SelectMenu";
import MacroDeleteModal from "./MacroDeleteModal";
import type { ActionBlock, Macro } from "../../types";

function blockCountLabel(n: number): string {
  return `${n} ${n === 1 ? "block" : "blocks"}`;
}

export default function MacroHeader({
  selectedId,
  draft,
  dirty,
  saving,
  onSelect,
  onChange,
  onCreate,
  onDelete,
}: {
  selectedId: string | null;
  draft: Macro | null;
  dirty: boolean;
  saving: boolean;
  onSelect: (id: string) => void;
  onChange: (next: Macro) => void;
  onCreate: () => void;
  onDelete: () => Promise<void>;
}) {
  const macros = useProfileStore((s) => s.macros);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick() {
      setMenuOpen(false);
    }
    function onDocKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onDocKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onDocKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    setConfirmDelete(false);
    setDeleteError("");
  }, [selectedId]);

  if (!draft) return null;

  async function duplicateMacro(m: Macro) {
    const copy: Macro = {
      ...m,
      id: crypto.randomUUID(),
      name: `${m.name} (copy)`,
      blocks: m.blocks.map((b: ActionBlock) => ({ ...b })),
    };
    await invoke("macro_save", { macroItem: copy });
    useProfileStore.getState().setMacros(await invoke<Macro[]>("macro_list"));
    setMenuOpen(false);
    onSelect(copy.id);
  }

  return (
    <>
      <div className="flow-head">
        <div className="flow-profile-header">
          <div className="flow-profile-title-row">
            <SelectMenu
              label="Select macro"
              value={selectedId}
              onSelect={onSelect}
              placeholder="Select a macro…"
              options={macros.map((m) => ({
                value: m.id,
                label: m.name || "(unnamed)",
                meta: blockCountLabel(m.blocks.length),
              }))}
            />
            <div className="rail-menu-wrap">
              <button
                className="rail-add"
                type="button"
                aria-label="Macro options"
                title="Macro options"
                aria-expanded={menuOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((o) => !o);
                }}
              >
                <Pencil aria-hidden="true" />
              </button>
              {menuOpen && (
                <div
                  className="rail-menu rail-menu-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="rail-menu-item"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onCreate();
                    }}
                  >
                    New Macro
                  </button>
                  <div className="rail-menu-divider" />
                  <button
                    className="rail-menu-item"
                    type="button"
                    onClick={() => void duplicateMacro(draft)}
                  >
                    Duplicate Macro
                  </button>
                  <button
                    className="rail-menu-item rail-menu-item-danger"
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDelete(true);
                    }}
                  >
                    Delete Macro
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flow-profile-sub-row">
            <span className="flow-trigger-counter">
              {blockCountLabel(draft.blocks.length)}
            </span>
            {dirty && (
              <span className="flow-dirty-indicator">
                <span className="dirty-dot" aria-hidden="true" />
                <span>Unsaved changes</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <input
        value={draft.name}
        aria-label="Macro name"
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        placeholder="Macro name"
        autoComplete="off"
      />

      {confirmDelete && (
        <MacroDeleteModal
          macro={draft}
          saving={saving}
          error={deleteError}
          onClose={() => {
            setConfirmDelete(false);
            setDeleteError("");
          }}
          onConfirm={async () => {
            try {
              await onDelete();
              setConfirmDelete(false);
            } catch (err) {
              setDeleteError(`Could not delete: ${err}`);
            }
          }}
        />
      )}
    </>
  );
}