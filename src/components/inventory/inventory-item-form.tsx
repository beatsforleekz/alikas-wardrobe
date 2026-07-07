"use client";

import { useEffect, useMemo, useState } from "react";

import { SlideOver } from "@/components/ui/slide-over";
import {
  EMPTY_INVENTORY_ITEM_INPUT,
  INVENTORY_STATUS_OPTIONS,
  TRAVEL_FRIENDLY_OPTIONS,
  normalizeInventoryItemInput,
  validateInventoryItemInput,
} from "@/lib/inventory";
import type { InventoryItem, InventoryItemInput } from "@/types/inventory";

type InventoryItemFormProps = {
  open: boolean;
  item: InventoryItem | null;
  existingItems: InventoryItem[];
  categories: string[];
  initialDraft?: InventoryItemInput | null;
  onClose: () => void;
  onSubmit: (input: InventoryItemInput, currentId?: string) => Promise<void>;
  onDelete: (item: InventoryItem) => Promise<void>;
  onDuplicate: (input: InventoryItemInput) => void;
};

export function InventoryItemForm({
  open,
  item,
  existingItems,
  categories,
  initialDraft,
  onClose,
  onSubmit,
  onDelete,
  onDuplicate,
}: InventoryItemFormProps) {
  const [draft, setDraft] = useState<InventoryItemInput>(EMPTY_INVENTORY_ITEM_INPUT);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(
        initialDraft
          ? initialDraft
          : item
            ? normalizeInventoryItemInput(item)
            : EMPTY_INVENTORY_ITEM_INPUT,
      );
      setErrors([]);
    }
  }, [initialDraft, item, open]);

  const categoryOptions = useMemo(
    () => [...new Set(categories.filter(Boolean))].sort((left, right) => left.localeCompare(right)),
    [categories],
  );
  const statusOptions = useMemo(
    () => [...INVENTORY_STATUS_OPTIONS].sort((left, right) => left.localeCompare(right)),
    [],
  );
  const travelFriendlyOptions = useMemo(
    () => [...TRAVEL_FRIENDLY_OPTIONS].sort((left, right) => left.localeCompare(right)),
    [],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateInventoryItemInput(
      draft,
      existingItems,
      { categories: categoryOptions, statuses: [...INVENTORY_STATUS_OPTIONS] },
      item?.item_id,
    );

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    setErrors([]);

    try {
      await onSubmit(draft, item?.id);
      onClose();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Unable to save this wardrobe item."]);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!item) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${item.item_id}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setErrors([]);

    try {
      await onDelete(item);
      onClose();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Unable to delete this wardrobe item."]);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleStatusShortcut(nextStatus: "Archived" | "Available") {
    if (!item) {
      return;
    }

    setIsSaving(true);
    setErrors([]);

    try {
      await onSubmit({ ...draft, status: nextStatus }, item.id);
      onClose();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Unable to update this wardrobe item."]);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={item ? "Edit wardrobe item" : "Add wardrobe item"}
      subtitle={item ? "Update the wardrobe record without leaving the collection view." : "Create a new wardrobe record and keep the closet current."}
      footer={
        <div className="form-footer-row">
          {item ? (
            <button
              type="button"
              className="ghost-button danger-button"
              onClick={handleDelete}
              disabled={isSaving}
            >
              Delete permanently
            </button>
          ) : <span />}
          <div className="form-footer-actions">
            {item ? (
              <button
                type="button"
                className="ghost-button"
                onClick={() => onDuplicate({ ...draft, item_id: "" })}
                disabled={isSaving}
              >
                Duplicate item
              </button>
            ) : null}
            {item ? (
              <button
                type="button"
                className="ghost-button"
                onClick={() =>
                  handleStatusShortcut(item.status?.trim() === "Archived" ? "Available" : "Archived")
                }
                disabled={isSaving}
              >
                {item.status?.trim() === "Archived" ? "Restore" : "Archive"}
              </button>
            ) : null}
            <button type="submit" form="inventory-item-form" className="primary-button" disabled={isSaving}>
              {isSaving ? "Saving..." : item ? "Save changes" : "Add item"}
            </button>
          </div>
        </div>
      }
    >
      <form id="inventory-item-form" className="editorial-form" onSubmit={handleSubmit}>
        {errors.length > 0 ? (
          <div className="form-error-stack">
            {errors.map((error) => (
              <p className="form-error" key={error}>
                {error}
              </p>
            ))}
          </div>
        ) : null}

        <div className="editorial-form-grid">
          <TextField label="Item ID" value={draft.item_id} onChange={(value) => setDraft((current) => ({ ...current, item_id: value }))} />
          <TextField label="Item name" value={draft.item_name} onChange={(value) => setDraft((current) => ({ ...current, item_name: value }))} />
          <SelectField
            label="Category"
            value={draft.category}
            options={categoryOptions}
            onChange={(value) => setDraft((current) => ({ ...current, category: value }))}
          />
          <SelectField
            label="Status"
            value={draft.status}
            options={statusOptions}
            onChange={(value) => setDraft((current) => ({ ...current, status: value }))}
          />
          <TextField label="Colour" value={draft.colour} onChange={(value) => setDraft((current) => ({ ...current, colour: value }))} />
          <TextField label="Silhouette" value={draft.silhouette} onChange={(value) => setDraft((current) => ({ ...current, silhouette: value }))} />
          <TextField label="Vibe" value={draft.vibe} onChange={(value) => setDraft((current) => ({ ...current, vibe: value }))} />
          <TextField label="Shoot level" value={draft.shoot_level} onChange={(value) => setDraft((current) => ({ ...current, shoot_level: value }))} />
          <SelectField
            label="Travel friendly"
            value={draft.travel_friendly}
            options={travelFriendlyOptions}
            onChange={(value) => setDraft((current) => ({ ...current, travel_friendly: value }))}
          />
          <TextField label="Set name" value={draft.set_name} onChange={(value) => setDraft((current) => ({ ...current, set_name: value }))} />
          <TextField label="Season" value={draft.season} onChange={(value) => setDraft((current) => ({ ...current, season: value }))} />
          <TextField label="Style type" value={draft.style_type} onChange={(value) => setDraft((current) => ({ ...current, style_type: value }))} />
        </div>

        <TextField label="Image URL" value={draft.image} onChange={(value) => setDraft((current) => ({ ...current, image: value }))} />
        {draft.image ? (
          <button
            type="button"
            className="ghost-button"
            onClick={() => setDraft((current) => ({ ...current, image: "" }))}
          >
            Remove image
          </button>
        ) : null}
        <TextField label="Tags" value={draft.tags} onChange={(value) => setDraft((current) => ({ ...current, tags: value }))} placeholder="Comma-separated tags" />
        <TextAreaField label="Notes" value={draft.notes} onChange={(value) => setDraft((current) => ({ ...current, notes: value }))} />
      </form>
    </SlideOver>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        className="text-input"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea
        className="text-area-input"
        rows={5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select className="filter-select" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
