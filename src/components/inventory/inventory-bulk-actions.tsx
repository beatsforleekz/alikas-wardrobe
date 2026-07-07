"use client";

import { useMemo, useState } from "react";

import { INVENTORY_STATUS_OPTIONS } from "@/lib/inventory";
import type { InventoryBulkActionInput } from "@/types/inventory";

type InventoryBulkActionsProps = {
  selectedCount: number;
  categoryOptions: string[];
  onApply: (action: InventoryBulkActionInput) => Promise<void>;
  onClear: () => void;
};

export function InventoryBulkActions({
  selectedCount,
  categoryOptions,
  onApply,
  onClear,
}: InventoryBulkActionsProps) {
  const [mode, setMode] = useState<InventoryBulkActionInput["type"]>("archive");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const sortedStatusOptions = useMemo(
    () => [...INVENTORY_STATUS_OPTIONS].sort((left, right) => left.localeCompare(right)),
    [],
  );
  const sortedCategoryOptions = useMemo(
    () => [...categoryOptions].sort((left, right) => left.localeCompare(right)),
    [categoryOptions],
  );

  async function handleApply() {
    setError("");

    const action = buildAction(mode, value);

    if (!action) {
      setError("Choose a value for this bulk action.");
      return;
    }

    setIsApplying(true);

    try {
      await onApply(action);
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to apply the bulk update.");
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="dashboard-card bulk-actions-card">
      <div className="bulk-actions-head">
        <div className="results-copy">
          <p className="results-heading">Bulk actions</p>
          <p>{selectedCount} wardrobe item{selectedCount > 1 ? "s" : ""} selected.</p>
        </div>
        <button type="button" className="ghost-button" onClick={onClear}>
          Clear selection
        </button>
      </div>

      <div className="bulk-actions-grid">
        <label className="field">
          <span>Action</span>
          <select className="filter-select" value={mode} onChange={(event) => setMode(event.target.value as InventoryBulkActionInput["type"])}>
            <option value="archive">Archive</option>
            <option value="restore">Restore</option>
            <option value="status">Change status</option>
            <option value="category">Change category</option>
            <option value="tags">Add tags</option>
          </select>
        </label>

        {mode === "status" ? (
          <label className="field">
            <span>Status</span>
            <select className="filter-select" value={value} onChange={(event) => setValue(event.target.value)}>
              <option value="">Select status</option>
              {sortedStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {mode === "category" ? (
          <label className="field">
            <span>Category</span>
            <select className="filter-select" value={value} onChange={(event) => setValue(event.target.value)}>
              <option value="">Select category</option>
              {sortedCategoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {mode === "tags" ? (
          <label className="field">
            <span>Tags</span>
            <input
              className="text-input"
              value={value}
              placeholder="Comma-separated tags"
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
        ) : null}

        <div className="bulk-actions-submit">
          <button type="button" className="primary-button" onClick={handleApply} disabled={isApplying}>
            {isApplying ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}

function buildAction(mode: InventoryBulkActionInput["type"], value: string): InventoryBulkActionInput | null {
  if (mode === "archive" || mode === "restore") {
    return { type: mode };
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (mode === "status") {
    return { type: "status", value: trimmed };
  }

  if (mode === "category") {
    return { type: "category", value: trimmed };
  }

  return { type: "tags", value: trimmed };
}
