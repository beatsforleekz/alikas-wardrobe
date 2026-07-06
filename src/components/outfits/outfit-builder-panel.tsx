"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { SlideOver } from "@/components/ui/slide-over";
import { LookbookPromptPanel } from "@/components/outfits/lookbook-prompt-panel";
import {
  buildValidatedOutfitFromInput,
  EMPTY_OUTFIT_INPUT,
  groupOutfitItems,
  normalizeOutfitInput,
  OUTFIT_GROUP_LABELS,
  validateOutfitInput,
} from "@/lib/outfits";
import { filterInventoryItems, getDisplayImage } from "@/lib/inventory";
import type { InventoryFilters, InventoryItem } from "@/types/inventory";
import type { Outfit, OutfitInput, OutfitLinkedItem } from "@/types/outfit";

const defaultPickerFilters: InventoryFilters = {
  query: "",
  category: "",
  status: "",
  season: "",
  style_type: "",
  travel_friendly: "",
};

const requiredStudioGroups = [
  "Hair",
  "Top",
  "Shoes",
  "Bag",
] as const;

type OutfitBuilderPanelProps = {
  open: boolean;
  outfit: Outfit | null;
  inventoryItems: InventoryItem[];
  onClose: () => void;
  onSubmit: (input: OutfitInput, currentId?: string) => Promise<void>;
  onDelete: (outfit: Outfit) => Promise<void>;
};

export function OutfitBuilderPanel({
  open,
  outfit,
  inventoryItems,
  onClose,
  onSubmit,
  onDelete,
}: OutfitBuilderPanelProps) {
  const [draft, setDraft] = useState<OutfitInput>(EMPTY_OUTFIT_INPUT);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerCategory, setPickerCategory] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedBoardItemId, setDraggedBoardItemId] = useState<string | null>(null);
  const [draggedBrowserItemId, setDraggedBrowserItemId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(outfit ? normalizeOutfitInput(outfit) : EMPTY_OUTFIT_INPUT);
      setPickerQuery("");
      setPickerCategory("");
      setErrors([]);
      setDraggedBoardItemId(null);
      setDraggedBrowserItemId(null);
    }
  }, [open, outfit]);

  const categoryOptions = useMemo(
    () =>
      [...new Set(inventoryItems.map((item) => item.category?.trim()).filter(Boolean) as string[])].sort(
        (left, right) => left.localeCompare(right),
      ),
    [inventoryItems],
  );

  const pickerItems = useMemo(
    () =>
      filterInventoryItems(inventoryItems, {
        ...defaultPickerFilters,
        query: pickerQuery,
        category: pickerCategory,
      }).slice(0, 140),
    [inventoryItems, pickerCategory, pickerQuery],
  );

  const validatedDraftOutfit = useMemo(
    () => buildValidatedOutfitFromInput(draft, inventoryItems),
    [draft, inventoryItems],
  );

  const groupedBoardItems = useMemo(() => {
    const grouped = groupOutfitItems(validatedDraftOutfit.linkedItems);

    return OUTFIT_GROUP_LABELS.map((groupLabel) => ({
      groupLabel,
      items: grouped.find((group) => group.groupLabel === groupLabel)?.items ?? [],
    }));
  }, [validatedDraftOutfit.linkedItems]);

  const categoriesUsed = useMemo(
    () =>
      [...new Set(validatedDraftOutfit.linkedItems.map((item) => item.groupLabel))].filter(Boolean),
    [validatedDraftOutfit.linkedItems],
  );

  const missingGroups = useMemo(
    () => requiredStudioGroups.filter((groupLabel) => !categoriesUsed.includes(groupLabel)),
    [categoriesUsed],
  );

  const hairSelected = useMemo(
    () => validatedDraftOutfit.linkedItems.some((item) => item.groupLabel === "Hair"),
    [validatedDraftOutfit.linkedItems],
  );

  const lookbookStatus = useMemo(() => {
    if (validatedDraftOutfit.linkedItemCount === 0) {
      return "Needs pieces";
    }

    if (validatedDraftOutfit.missingItemCount > 0) {
      return "Missing item references";
    }

    if (validatedDraftOutfit.needsReviewCount > 0) {
      return "Needs review";
    }

    return "Ready for prompt";
  }, [validatedDraftOutfit]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateOutfitInput(draft, inventoryItems);

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSaving(true);
    setErrors([]);

    try {
      await onSubmit(draft, outfit?.id);
      onClose();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Unable to save this outfit."]);
    } finally {
      setIsSaving(false);
    }
  }

  function addItem(itemId: string) {
    setDraft((current) =>
      current.item_ids.includes(itemId)
        ? current
        : { ...current, item_ids: [...current.item_ids, itemId] },
    );
  }

  function removeItem(itemId: string) {
    setDraft((current) => ({
      ...current,
      item_ids: current.item_ids.filter((entry) => entry !== itemId),
    }));
  }

  function moveItem(itemId: string, direction: -1 | 1) {
    setDraft((current) => {
      const index = current.item_ids.findIndex((entry) => entry === itemId);

      if (index < 0) {
        return current;
      }

      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.item_ids.length) {
        return current;
      }

      const nextIds = [...current.item_ids];
      const [moved] = nextIds.splice(index, 1);
      nextIds.splice(nextIndex, 0, moved);

      return {
        ...current,
        item_ids: nextIds,
      };
    });
  }

  function placeDraggedBoardItem(targetItemId: string) {
    if (!draggedBoardItemId || draggedBoardItemId === targetItemId) {
      return;
    }

    setDraft((current) => {
      const nextIds = [...current.item_ids];
      const sourceIndex = nextIds.indexOf(draggedBoardItemId);
      const targetIndex = nextIds.indexOf(targetItemId);

      if (sourceIndex < 0 || targetIndex < 0) {
        return current;
      }

      const [moved] = nextIds.splice(sourceIndex, 1);
      nextIds.splice(targetIndex, 0, moved);

      return {
        ...current,
        item_ids: nextIds,
      };
    });
  }

  function handleBoardDrop(targetItemId?: string) {
    if (draggedBrowserItemId) {
      addItem(draggedBrowserItemId);
    } else if (draggedBoardItemId && targetItemId) {
      placeDraggedBoardItem(targetItemId);
    }

    setDraggedBrowserItemId(null);
    setDraggedBoardItemId(null);
  }

  async function handleDelete() {
    if (!outfit) {
      return;
    }

    const confirmed = window.confirm(
      `Delete lookbook "${outfit.title}" permanently? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setErrors([]);

    try {
      await onDelete(outfit);
      onClose();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Unable to delete this lookbook."]);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={outfit ? "Outfit Studio" : "New Outfit Studio"}
      subtitle="Build visually, reorder naturally, and keep every look anchored to real wardrobe pieces."
      panelClassName="slideover-panel-studio"
    >
      <form id="outfit-builder-form" className="studio-form" onSubmit={handleSubmit}>
        {errors.length > 0 ? (
          <div className="form-error-stack">
            {errors.map((error) => (
              <p className="form-error" key={error}>
                {error}
              </p>
            ))}
          </div>
        ) : null}

        <div className="studio-layout">
          <section className="studio-column studio-browser">
            <div className="studio-section-head">
              <div className="results-copy">
                <p className="results-heading">Wardrobe browser</p>
                <p>Search, filter, and add pieces into the outfit board.</p>
              </div>
            </div>

            <div className="studio-browser-controls">
              <input
                className="search-input"
                type="search"
                value={pickerQuery}
                placeholder="Search wardrobe items"
                onChange={(event) => setPickerQuery(event.target.value)}
              />
              <select
                className="filter-select"
                value={pickerCategory}
                onChange={(event) => setPickerCategory(event.target.value)}
              >
                <option value="">All categories</option>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <div className="studio-category-row">
                {categoryOptions.slice(0, 8).map((category) => (
                  <button
                    type="button"
                    key={category}
                    className={`studio-category-chip ${pickerCategory === category ? "is-active" : ""}`}
                    onClick={() => setPickerCategory((current) => (current === category ? "" : category))}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="studio-browser-grid">
              {pickerItems.map((item) => {
                const imageUrl = getDisplayImage(item.image);
                const isSelected = draft.item_ids.includes(item.item_id);

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`studio-browser-card ${isSelected ? "is-selected" : ""}`}
                    onClick={() => (isSelected ? removeItem(item.item_id) : addItem(item.item_id))}
                    draggable
                    onDragStart={() => {
                      setDraggedBrowserItemId(item.item_id);
                      setDraggedBoardItemId(null);
                    }}
                    onDragEnd={() => setDraggedBrowserItemId(null)}
                  >
                    <div className="studio-browser-image-wrap">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={item.item_name || item.item_id}
                          fill
                          className="studio-browser-image"
                          sizes="(max-width: 900px) 33vw, 180px"
                        />
                      ) : (
                        <div className="studio-browser-placeholder">No image</div>
                      )}
                    </div>
                    <div className="studio-browser-copy">
                      <p className="sku-label">{item.item_id}</p>
                      <h3>{item.item_name || item.item_id}</h3>
                      <p>{item.category || "Uncategorised"}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section
            className="studio-column studio-board"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleBoardDrop()}
          >
            <div className="studio-section-head">
              <div className="results-copy">
                <p className="results-heading">Outfit board</p>
                <p>Arrange the look visually, reorder gently, and remove pieces as you style.</p>
              </div>
            </div>

            {validatedDraftOutfit.linkedItemCount === 0 ? (
              <div className="studio-board-empty">
                <div className="studio-board-empty-mark" aria-hidden="true" />
                <p className="results-heading">Start building your look.</p>
                <p>Click a wardrobe piece or drag it into the board to begin styling.</p>
              </div>
            ) : (
              <div className="studio-board-groups">
                {groupedBoardItems.map((group) => (
                  <section className="studio-board-group" key={group.groupLabel}>
                    <div className="studio-board-group-head">
                      <h2>{group.groupLabel}</h2>
                      <span className="sku-label">
                        {group.items.length} item{group.items.length === 1 ? "" : "s"}
                      </span>
                    </div>

                    {group.items.length === 0 ? (
                      <div className="studio-board-group-empty">No {group.groupLabel.toLowerCase()} selected.</div>
                    ) : (
                      <div className="studio-board-grid">
                        {group.items.map((linkedItem) => (
                          <BoardCard
                            key={`${group.groupLabel}-${linkedItem.itemId}`}
                            linkedItem={linkedItem}
                            onRemove={() => removeItem(linkedItem.itemId)}
                            onMoveUp={() => moveItem(linkedItem.itemId, -1)}
                            onMoveDown={() => moveItem(linkedItem.itemId, 1)}
                            onDragStart={() => {
                              setDraggedBoardItemId(linkedItem.itemId);
                              setDraggedBrowserItemId(null);
                            }}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => handleBoardDrop(linkedItem.itemId)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>
            )}
          </section>

          <aside className="studio-column studio-details">
            <div className="studio-section-head">
              <div className="results-copy">
                <p className="results-heading">Outfit details</p>
                <p>Refine the story, check what is missing, and generate the lookbook prompt.</p>
              </div>
            </div>

            <div className="studio-details-stack">
              <div className="detail-card studio-summary-card">
                <div className="detail-chip-row">
                  <span className="detail-chip">{validatedDraftOutfit.linkedItemCount} pieces</span>
                  <span className="detail-chip">{categoriesUsed.length} categories used</span>
                  <span className="detail-chip">{hairSelected ? "Hair selected" : "Hair missing"}</span>
                  <span className="detail-chip">{lookbookStatus}</span>
                </div>
                <p className="studio-summary-line">
                  Missing categories: {missingGroups.length ? missingGroups.join(", ") : "None"}
                </p>
              </div>

              <div className="detail-card studio-details-card">
                <div className="studio-details-grid">
                  <TextField
                    label="Title"
                    value={draft.title}
                    onChange={(value) => setDraft((current) => ({ ...current, title: value }))}
                  />
                  <TextField
                    label="Occasion"
                    value={draft.occasion}
                    onChange={(value) => setDraft((current) => ({ ...current, occasion: value }))}
                  />
                  <TextField
                    label="Trip"
                    value={draft.trip}
                    onChange={(value) => setDraft((current) => ({ ...current, trip: value }))}
                  />
                  <TextField
                    label="Tags"
                    value={draft.tags}
                    onChange={(value) => setDraft((current) => ({ ...current, tags: value }))}
                    placeholder="Comma-separated tags"
                  />
                </div>

                <TextField
                  label="Cover image URL"
                  value={draft.coverImage}
                  onChange={(value) => setDraft((current) => ({ ...current, coverImage: value }))}
                />

                <TextAreaField
                  label="Notes"
                  value={draft.notes}
                  onChange={(value) => setDraft((current) => ({ ...current, notes: value }))}
                />

                <div className="studio-save-row">
                  <div className="studio-save-actions">
                    {outfit ? (
                      <button
                        type="button"
                        className="ghost-button danger-button"
                        onClick={handleDelete}
                        disabled={isSaving}
                      >
                        Delete lookbook
                      </button>
                    ) : null}
                    <button type="submit" className="primary-button" disabled={isSaving}>
                      {isSaving ? "Saving..." : outfit ? "Save outfit" : "Create outfit"}
                    </button>
                  </div>
                </div>
              </div>

              <LookbookPromptPanel
                validatedOutfit={validatedDraftOutfit}
                inventoryItems={inventoryItems}
                title="Lookbook prompt"
              />
            </div>
          </aside>
        </div>
      </form>
    </SlideOver>
  );
}

function BoardCard({
  linkedItem,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  linkedItem: OutfitLinkedItem;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDrop: () => void;
}) {
  const inventoryItem = linkedItem.inventoryItem;
  const imageUrl = inventoryItem ? getDisplayImage(inventoryItem.image) : null;

  return (
    <article
      className="studio-board-card"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="studio-board-card-image-wrap">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={inventoryItem?.item_name || linkedItem.itemId}
            fill
            className="studio-board-card-image"
            sizes="180px"
          />
        ) : (
          <div className="studio-board-card-placeholder">No image</div>
        )}
      </div>

      <div className="studio-board-card-copy">
        <p className="sku-label">{linkedItem.itemId}</p>
        <h3>{inventoryItem?.item_name || "Missing wardrobe item"}</h3>
        <p>{inventoryItem?.category || linkedItem.categoryLabel}</p>
      </div>

      <div className="studio-board-card-actions">
        <button type="button" className="ghost-button studio-mini-button" onClick={onMoveUp}>
          Up
        </button>
        <button type="button" className="ghost-button studio-mini-button" onClick={onMoveDown}>
          Down
        </button>
        <button type="button" className="ghost-button studio-mini-button" onClick={onRemove}>
          Remove
        </button>
      </div>
    </article>
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
        rows={6}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
