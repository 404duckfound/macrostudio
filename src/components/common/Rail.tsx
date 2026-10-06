import type { ReactNode } from "react";
import { Plus } from "lucide-react";

interface RailProps<T extends { id: string }> {
  title: string;
  ariaLabel?: string;
  addAriaLabel: string;
  items: T[];
  selectedId: string | null;
  emptyText: string;
  createLabel: string;
  disabled?: boolean;
  onSelect: (id: string) => void;
  onAdd: () => void;
  renderName: (item: T) => ReactNode;
  renderMeta: (item: T) => ReactNode;
  renderActions?: (item: T) => ReactNode;
}

export default function Rail<T extends { id: string }>({
  title,
  ariaLabel,
  addAriaLabel,
  items,
  selectedId,
  emptyText,
  createLabel,
  disabled,
  onSelect,
  onAdd,
  renderName,
  renderMeta,
  renderActions,
}: RailProps<T>) {
  return (
    <aside className="rail" aria-label={ariaLabel}>
      <div className="rail-head">
        <span className="rail-title">{title}</span>
        <button
          className="rail-add"
          type="button"
          aria-label={addAriaLabel}
          title={addAriaLabel}
          disabled={disabled}
          onClick={onAdd}
        >
          <Plus aria-hidden="true" />
        </button>
      </div>
      <div className="rail-list">
        {items.length === 0 ? (
          <div className="rail-empty">
            <p>{emptyText}</p>
            <button
              type="button"
              className="btn-secondary rail-empty-btn"
              disabled={disabled}
              onClick={onAdd}
            >
              <Plus aria-hidden="true" />
              <span>{createLabel}</span>
            </button>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={`rail-row ${selectedId === item.id ? "active" : ""}`}
              onClick={() => onSelect(item.id)}
            >
              <div className="rail-row-main">
                <span className="rail-row-name">{renderName(item)}</span>
                <span className="rail-row-meta">{renderMeta(item)}</span>
              </div>
              {renderActions?.(item)}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
