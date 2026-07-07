"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { SlideOver } from "@/components/ui/slide-over";
import {
  EMPTY_WISHLIST_ITEM_INPUT,
  WISHLIST_ENTRY_TYPE_OPTIONS,
  WISHLIST_STATUS_OPTIONS,
  formatWishlistEntryType,
  formatWishlistStatus,
  validateWishlistItemInput,
} from "@/lib/wishlist";
import type { Outfit } from "@/types/outfit";
import type { Trip } from "@/types/travel";
import type { WishlistItem, WishlistItemInput } from "@/types/wishlist";

type WishlistFormPanelProps = {
  open: boolean;
  item: WishlistItem | null;
  initialDraft?: WishlistItemInput | null;
  categorySuggestions: string[];
  outfits: Outfit[];
  trips: Trip[];
  linkedOutfitIds: string[];
  linkedTripIds: string[];
  onClose: () => void;
  onSubmit: (input: WishlistItemInput, itemId?: string) => Promise<void>;
  onDelete: (item: WishlistItem) => Promise<void>;
};

export function WishlistFormPanel({
  open,
  item,
  initialDraft,
  categorySuggestions,
  outfits,
  trips,
  linkedOutfitIds,
  linkedTripIds,
  onClose,
  onSubmit,
  onDelete,
}: WishlistFormPanelProps) {
  const [draft, setDraft] = useState<WishlistItemInput>(EMPTY_WISHLIST_ITEM_INPUT);
  const [errors, setErrors] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const sortedCategorySuggestions = useMemo(
    () => [...new Set(categorySuggestions.filter(Boolean))].sort((left, right) => left.localeCompare(right)),
    [categorySuggestions],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialDraft) {
      setDraft(initialDraft);
      setErrors([]);
      return;
    }

    if (item) {
      setDraft({
        entry_type: item.entry_type,
        item_name: item.item_name,
        category: item.category ?? "",
        colour_material: item.colour_material ?? "",
        reason: item.reason ?? "",
        priority_rating: item.priority_rating,
        status: item.status,
        estimated_outfits_improved: item.estimated_outfits_improved,
        notes: item.notes ?? "",
        link_url: item.link_url ?? "",
        image_url: item.image_url ?? "",
        related_outfit_ids: linkedOutfitIds,
        related_trip_ids: linkedTripIds,
      });
      setErrors([]);
      return;
    }

    setDraft(EMPTY_WISHLIST_ITEM_INPUT);
    setErrors([]);
  }, [initialDraft, item, linkedOutfitIds, linkedTripIds, open]);

  function toggleRelation(
    key: "related_outfit_ids" | "related_trip_ids",
    nextId: string,
  ) {
    setDraft((current) => ({
      ...current,
      [key]: current[key].includes(nextId)
        ? current[key].filter((entryId) => entryId !== nextId)
        : [...current[key], nextId],
    }));
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateWishlistItemInput(draft);

    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      return;
    }

    startTransition(async () => {
      try {
        await onSubmit(draft, item?.id);
        onClose();
      } catch (error) {
        setErrors([error instanceof Error ? error.message : "Unable to save this wishlist item."]);
      }
    });
  }

  async function handleDelete() {
    if (!item) {
      return;
    }

    const confirmed = window.confirm(`Delete ${item.item_name} from ${formatWishlistEntryType(item.entry_type)}?`);

    if (!confirmed) {
      return;
    }

    try {
      await onDelete(item);
      onClose();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Unable to delete this wishlist item."]);
    }
  }

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={item ? "Edit wishlist item" : "Add wishlist item"}
      subtitle="Track what to buy, why it matters, and which looks or trips it improves."
      footer={
        <div className="form-footer-row">
          {item ? (
            <button
              type="button"
              className="ghost-button danger-button"
              onClick={() => void handleDelete()}
              disabled={isPending}
            >
              Delete
            </button>
          ) : <span />}
          <button type="submit" form="wishlist-item-form" className="primary-button" disabled={isPending}>
            {isPending ? "Saving..." : item ? "Save changes" : "Add item"}
          </button>
        </div>
      }
    >
      <form id="wishlist-item-form" className="editorial-form" onSubmit={submitForm}>
        {errors.length > 0 ? (
          <div className="form-error-stack">
            {errors.map((error) => (
              <p className="form-error" key={error}>
                {error}
              </p>
            ))}
          </div>
        ) : null}

        <div className="editorial-form-grid editorial-form-grid-double">
          <label className="field">
            <span>Section</span>
            <select
              className="filter-select"
              value={draft.entry_type}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  entry_type: event.target.value as WishlistItemInput["entry_type"],
                }))
              }
            >
              {WISHLIST_ENTRY_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatWishlistEntryType(option)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Status</span>
            <select
              className="filter-select"
              value={draft.status}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  status: event.target.value as WishlistItemInput["status"],
                }))
              }
            >
              {WISHLIST_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatWishlistStatus(option)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Item name</span>
            <input
              className="text-input"
              value={draft.item_name}
              onChange={(event) => setDraft((current) => ({ ...current, item_name: event.target.value }))}
              placeholder="Gold flat sandals"
              required
            />
          </label>

          <label className="field">
            <span>Category</span>
            <input
              className="text-input"
              list="wishlist-category-options"
              value={draft.category}
              onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
              placeholder="Shoes"
            />
            <datalist id="wishlist-category-options">
              {sortedCategorySuggestions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>

          <label className="field">
            <span>Colour / material</span>
            <input
              className="text-input"
              value={draft.colour_material}
              onChange={(event) =>
                setDraft((current) => ({ ...current, colour_material: event.target.value }))
              }
              placeholder="Gold leather"
            />
          </label>

          <label className="field">
            <span>Priority</span>
            <select
              className="filter-select"
              value={draft.priority_rating}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  priority_rating: Number(event.target.value),
                }))
              }
            >
              {[1, 2, 3, 4, 5].map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Estimated outfits improved</span>
            <input
              className="text-input"
              type="number"
              min="0"
              value={draft.estimated_outfits_improved}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  estimated_outfits_improved: Math.max(0, Number(event.target.value) || 0),
                }))
              }
            />
          </label>
        </div>

        <label className="field">
          <span>Reason</span>
          <textarea
            className="text-area-input"
            rows={4}
            value={draft.reason}
            onChange={(event) => setDraft((current) => ({ ...current, reason: event.target.value }))}
            placeholder="Why this piece matters to the wardrobe, packing, or lookbook mix."
          />
        </label>

        <div className="editorial-form-grid editorial-form-grid-double">
          <label className="field">
            <span>Reference link</span>
            <input
              className="text-input"
              value={draft.link_url}
              onChange={(event) => setDraft((current) => ({ ...current, link_url: event.target.value }))}
              placeholder="https://..."
            />
          </label>

          <label className="field">
            <span>Image URL</span>
            <input
              className="text-input"
              value={draft.image_url}
              onChange={(event) => setDraft((current) => ({ ...current, image_url: event.target.value }))}
              placeholder="https://..."
            />
          </label>
        </div>

        <label className="field">
          <span>Notes</span>
          <textarea
            className="text-area-input"
            rows={5}
            value={draft.notes}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Shopping notes, price thoughts, what it replaces, or capsule notes..."
          />
        </label>

        <div className="wishlist-relation-editor">
          <div className="wishlist-relation-block">
            <div className="wishlist-relation-head">
              <p className="results-heading">Related lookbooks</p>
              <span className="detail-chip">{draft.related_outfit_ids.length} linked</span>
            </div>
            <div className="wishlist-relation-grid">
              {outfits.length === 0 ? (
                <p className="wishlist-relation-empty">No lookbooks available yet.</p>
              ) : (
                outfits.map((outfit) => (
                  <button
                    type="button"
                    key={outfit.id}
                    className={`wishlist-relation-chip ${draft.related_outfit_ids.includes(outfit.id) ? "is-selected" : ""}`}
                    onClick={() => toggleRelation("related_outfit_ids", outfit.id)}
                  >
                    <span>{outfit.title}</span>
                    {outfit.trip ? <small>{outfit.trip}</small> : outfit.occasion ? <small>{outfit.occasion}</small> : null}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="wishlist-relation-block">
            <div className="wishlist-relation-head">
              <p className="results-heading">Related trips</p>
              <span className="detail-chip">{draft.related_trip_ids.length} linked</span>
            </div>
            <div className="wishlist-relation-grid">
              {trips.length === 0 ? (
                <p className="wishlist-relation-empty">No trips available yet.</p>
              ) : (
                trips.map((trip) => (
                  <button
                    type="button"
                    key={trip.id}
                    className={`wishlist-relation-chip ${draft.related_trip_ids.includes(trip.id) ? "is-selected" : ""}`}
                    onClick={() => toggleRelation("related_trip_ids", trip.id)}
                  >
                    <span>{trip.title}</span>
                    {trip.destination ? <small>{trip.destination}</small> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </form>
    </SlideOver>
  );
}
