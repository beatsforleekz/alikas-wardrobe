"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import { SlideOver } from "@/components/ui/slide-over";
import { LookbookPromptPanel } from "@/components/outfits/lookbook-prompt-panel";
import {
  buildValidatedOutfitFromInput,
  EMPTY_OUTFIT_INPUT,
  normalizeOutfitInput,
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

const STUDIO_SECTION_ORDER = [
  "Hair",
  "Hat",
  "Dress",
  "One Piece",
  "Top",
  "Bodysuit",
  "Bottom",
  "Skirt",
  "Shorts",
  "Swimwear",
  "Cover Up",
  "Outerwear",
  "Shoes",
  "Bag",
  "Sunglasses",
  "Accessories",
] as const;

type StudioSectionLabel = (typeof STUDIO_SECTION_ORDER)[number];

type BoardSection = {
  groupLabel: StudioSectionLabel;
  items: OutfitLinkedItem[];
  isManual: boolean;
};

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
  const [sectionOrder, setSectionOrder] = useState<StudioSectionLabel[]>([]);
  const [manualSections, setManualSections] = useState<StudioSectionLabel[]>([]);
  const [pendingSection, setPendingSection] = useState<StudioSectionLabel | "">("");

  useEffect(() => {
    if (open) {
      setDraft(outfit ? normalizeOutfitInput(outfit) : EMPTY_OUTFIT_INPUT);
      setPickerQuery("");
      setPickerCategory("");
      setErrors([]);
      setDraggedBoardItemId(null);
      setDraggedBrowserItemId(null);
      const initialSections = getOrderedSections(
        getVisibleSections(buildValidatedOutfitFromInput(outfit ? normalizeOutfitInput(outfit) : EMPTY_OUTFIT_INPUT, inventoryItems).linkedItems),
      );
      setSectionOrder(initialSections);
      setManualSections([]);
      setPendingSection(getFirstAvailableSection(initialSections));
    }
  }, [open, outfit, inventoryItems]);

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

  useEffect(() => {
    if (!open) {
      return;
    }

    const sectionsWithItems = getVisibleSections(validatedDraftOutfit.linkedItems);

    setSectionOrder((current) => {
      const visible = current.filter(
        (section) => sectionsWithItems.includes(section) || manualSections.includes(section),
      );
      const combined = sectionsWithItems.reduce(
        (orderedSections, section) => insertSectionInDefaultPosition(orderedSections, section),
        visible,
      );
      return areSectionsEqual(current, combined) ? current : combined;
    });

    setManualSections((current) => {
      const nextManualSections = current.filter((section) => !sectionsWithItems.includes(section));
      return areSectionsEqual(current, nextManualSections) ? current : nextManualSections;
    });
  }, [open, validatedDraftOutfit.linkedItems, manualSections]);

  const groupedBoardItems = useMemo<BoardSection[]>(() => {
    const itemsBySection = new Map<StudioSectionLabel, OutfitLinkedItem[]>();

    validatedDraftOutfit.linkedItems.forEach((linkedItem) => {
      const groupLabel = getStudioSectionLabel(linkedItem);
      const currentItems = itemsBySection.get(groupLabel) ?? [];
      currentItems.push(linkedItem);
      itemsBySection.set(groupLabel, currentItems);
    });

    return sectionOrder.map((groupLabel) => ({
      groupLabel,
      items: itemsBySection.get(groupLabel) ?? [],
      isManual: manualSections.includes(groupLabel),
    }));
  }, [manualSections, sectionOrder, validatedDraftOutfit.linkedItems]);

  const categoriesUsed = useMemo(
    () => getVisibleSections(validatedDraftOutfit.linkedItems),
    [validatedDraftOutfit.linkedItems],
  );

  const missingGroups = useMemo(
    () => requiredStudioGroups.filter((groupLabel) => !categoriesUsed.includes(groupLabel)),
    [categoriesUsed],
  );

  const hairSelected = useMemo(
    () => categoriesUsed.includes("Hair"),
    [categoriesUsed],
  );

  const availableSections = useMemo(
    () => STUDIO_SECTION_ORDER.filter((section) => !sectionOrder.includes(section)),
    [sectionOrder],
  );

  useEffect(() => {
    setPendingSection((current) => {
      if (current && availableSections.includes(current)) {
        return current;
      }

      return getFirstAvailableSection(sectionOrder);
    });
  }, [availableSections, sectionOrder]);

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
    const inventoryItem = inventoryItems.find((item) => item.item_id === itemId) ?? null;
    const targetSection = getStudioSectionLabelFromInventory(inventoryItem);

    setDraft((current) =>
      current.item_ids.includes(itemId)
        ? current
        : { ...current, item_ids: [...current.item_ids, itemId] },
    );
    setSectionOrder((current) =>
      current.includes(targetSection) ? current : insertSectionInDefaultPosition(current, targetSection),
    );
    setManualSections((current) => current.filter((section) => section !== targetSection));
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

  function addSection(section: StudioSectionLabel) {
    setSectionOrder((current) => insertSectionInDefaultPosition(current, section));
    setManualSections((current) => (current.includes(section) ? current : [...current, section]));
  }

  function moveSection(section: StudioSectionLabel, direction: -1 | 1) {
    setSectionOrder((current) => {
      const index = current.indexOf(section);

      if (index < 0) {
        return current;
      }

      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const nextSections = [...current];
      const [moved] = nextSections.splice(index, 1);
      nextSections.splice(nextIndex, 0, moved);
      return nextSections;
    });
  }

  function removeSection(section: StudioSectionLabel) {
    setSectionOrder((current) => current.filter((entry) => entry !== section));
    setManualSections((current) => current.filter((entry) => entry !== section));
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
              <div className="studio-board-toolbar">
                <label className="studio-section-picker">
                  <span>Add section</span>
                  <div className="studio-section-picker-row">
                    <select
                      className="filter-select"
                      value={pendingSection}
                      onChange={(event) => setPendingSection(event.target.value as StudioSectionLabel | "")}
                      disabled={availableSections.length === 0}
                    >
                      {availableSections.length === 0 ? (
                        <option value="">All sections added</option>
                      ) : null}
                      {availableSections.map((section) => (
                        <option key={section} value={section}>
                          {section}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="ghost-button studio-mini-button"
                      disabled={!pendingSection}
                      onClick={() => {
                        if (pendingSection) {
                          addSection(pendingSection);
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                </label>
              </div>
            </div>

            {groupedBoardItems.length === 0 ? (
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
                      <div className="studio-board-group-copy">
                        <h2>{group.groupLabel}</h2>
                        <span className="sku-label">
                          {group.items.length} item{group.items.length === 1 ? "" : "s"}
                        </span>
                        {group.isManual && group.items.length === 0 ? (
                          <span className="sku-label">Added manually</span>
                        ) : null}
                      </div>
                      <div className="studio-board-group-actions">
                        <button
                          type="button"
                          className="ghost-button studio-mini-button"
                          onClick={() => moveSection(group.groupLabel, -1)}
                          disabled={sectionOrder.indexOf(group.groupLabel) === 0}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="ghost-button studio-mini-button"
                          onClick={() => moveSection(group.groupLabel, 1)}
                          disabled={sectionOrder.indexOf(group.groupLabel) === sectionOrder.length - 1}
                        >
                          Down
                        </button>
                        {group.items.length === 0 ? (
                          <button
                            type="button"
                            className="ghost-button studio-mini-button"
                            onClick={() => removeSection(group.groupLabel)}
                          >
                            Remove section
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {group.items.length === 0 ? (
                      <div className="studio-board-group-empty">
                        This section is ready when you want to add {group.groupLabel.toLowerCase()}.
                      </div>
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

function getStudioSectionLabel(linkedItem: OutfitLinkedItem): StudioSectionLabel {
  return getStudioSectionLabelFromInventory(linkedItem.inventoryItem, linkedItem);
}

function getStudioSectionLabelFromInventory(
  inventoryItem: InventoryItem | null,
  linkedItem?: OutfitLinkedItem,
): StudioSectionLabel {
  const itemId = inventoryItem?.item_id.trim().toUpperCase() ?? linkedItem?.itemId.trim().toUpperCase() ?? "";
  const category = inventoryItem?.category?.trim().toLowerCase() ?? linkedItem?.categoryLabel.trim().toLowerCase() ?? "";
  const existingGroup = linkedItem?.groupLabel.trim().toLowerCase() ?? "";

  if (itemId === "TOP_051" || category === "cover up" || existingGroup === "cover up") {
    return "Cover Up";
  }

  if (itemId === "COVERUP_001") {
    return "Bottom";
  }

  if (category === "hair" || existingGroup === "hair" || itemId.startsWith("HAIR_")) {
    return "Hair";
  }

  if (category === "hat" || category === "hats" || existingGroup === "hat" || itemId.startsWith("HAT_")) {
    return "Hat";
  }

  if (category === "dress" || itemId.startsWith("DRESS_")) {
    return "Dress";
  }

  if (
    ["one piece", "set", "romper", "jumpsuit"].includes(category) ||
    itemId.startsWith("ONEPIECE_") ||
    itemId.startsWith("SET_") ||
    itemId.startsWith("ROMPER_")
  ) {
    return "One Piece";
  }

  if (category === "top" || existingGroup === "top" || itemId.startsWith("TOP_")) {
    return "Top";
  }

  if (category === "bodysuit" || itemId.startsWith("BODYSUIT_")) {
    return "Bodysuit";
  }

  if (["bottom", "bottoms", "pants", "trousers", "jeans"].includes(category) || itemId.startsWith("BOTTOM_")) {
    return "Bottom";
  }

  if (category === "skirt" || itemId.startsWith("SKIRT_")) {
    return "Skirt";
  }

  if (category === "shorts" || itemId.startsWith("SHORTS_")) {
    return "Shorts";
  }

  if (category === "swimwear" || category === "swim set" || itemId.startsWith("SWIM_")) {
    return "Swimwear";
  }

  if (category === "outerwear" || itemId.startsWith("OUTERWEAR_")) {
    return "Outerwear";
  }

  if (category === "shoes" || existingGroup === "shoes" || itemId.startsWith("SHOE_")) {
    return "Shoes";
  }

  if (category === "bag" || existingGroup === "bag" || itemId.startsWith("BAG_")) {
    return "Bag";
  }

  if (
    category === "sunglasses" ||
    category === "eyewear" ||
    category === "glasses" ||
    itemId.startsWith("SUNGLASSES_")
  ) {
    return "Sunglasses";
  }

  return "Accessories";
}

function getVisibleSections(linkedItems: OutfitLinkedItem[]) {
  return getOrderedSections(linkedItems.map((item) => getStudioSectionLabel(item)));
}

function getOrderedSections(sections: readonly StudioSectionLabel[]) {
  const deduped = [...new Set(sections)];
  return STUDIO_SECTION_ORDER.filter((section) => deduped.includes(section));
}

function insertSectionInDefaultPosition(
  currentSections: readonly StudioSectionLabel[],
  nextSection: StudioSectionLabel,
) {
  if (currentSections.includes(nextSection)) {
    return [...currentSections];
  }

  const nextIndex = STUDIO_SECTION_ORDER.indexOf(nextSection);
  const insertAt = currentSections.findIndex(
    (section) => STUDIO_SECTION_ORDER.indexOf(section) > nextIndex,
  );

  if (insertAt < 0) {
    return [...currentSections, nextSection];
  }

  return [
    ...currentSections.slice(0, insertAt),
    nextSection,
    ...currentSections.slice(insertAt),
  ];
}

function getFirstAvailableSection(sectionOrder: readonly StudioSectionLabel[]) {
  return STUDIO_SECTION_ORDER.find((section) => !sectionOrder.includes(section)) ?? "";
}

function areSectionsEqual(left: readonly StudioSectionLabel[], right: readonly StudioSectionLabel[]) {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}
