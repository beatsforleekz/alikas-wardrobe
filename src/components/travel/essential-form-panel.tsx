"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { SlideOver } from "@/components/ui/slide-over";
import {
  ESSENTIAL_CATEGORY_OPTIONS,
  ESSENTIAL_INCLUSION_OPTIONS,
  defaultEssentialLibraryItemInput,
  formatEssentialInclusionType,
} from "@/lib/travel";
import type { EssentialLibraryItem, EssentialLibraryItemInput } from "@/types/travel";

type EssentialFormPanelProps = {
  open: boolean;
  item: EssentialLibraryItem | null;
  onClose: () => void;
  onSubmit: (input: EssentialLibraryItemInput, itemId?: string) => Promise<void>;
};

export function EssentialFormPanel({
  open,
  item,
  onClose,
  onSubmit,
}: EssentialFormPanelProps) {
  const [draft, setDraft] = useState<EssentialLibraryItemInput>(defaultEssentialLibraryItemInput);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const categoryOptions = useMemo(
    () => [...ESSENTIAL_CATEGORY_OPTIONS].sort((left, right) => left.localeCompare(right)),
    [],
  );
  const inclusionOptions = useMemo(
    () => [...ESSENTIAL_INCLUSION_OPTIONS].sort((left, right) => left.localeCompare(right)),
    [],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    if (item) {
      setDraft({
        title: item.title,
        category: item.category,
        inclusion_type: item.inclusion_type,
        notes: item.notes ?? "",
      });
      setErrorMessage("");
      return;
    }

    setDraft(defaultEssentialLibraryItemInput);
    setErrorMessage("");
  }, [item, open]);

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!draft.title.trim()) {
      setErrorMessage("Add an essential item name before saving.");
      return;
    }

    startTransition(async () => {
      try {
        await onSubmit(draft, item?.id);
        onClose();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to save this essential item.");
      }
    });
  }

  return (
    <SlideOver
      title={item ? "Edit essential" : "New essential"}
      subtitle="This library stays reusable across every trip, so pack logic can inherit from it instead of starting from scratch."
      open={open}
      onClose={onClose}
      footer={
        <button className="primary-button" type="submit" form="essential-form" disabled={isPending}>
          {isPending ? "Saving..." : item ? "Save changes" : "Add to library"}
        </button>
      }
    >
      <form id="essential-form" className="editorial-form" onSubmit={submitForm}>
        <label className="field">
          <span>Item name</span>
          <input
            className="text-input"
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Passport"
            required
          />
        </label>

        <div className="editorial-form-grid editorial-form-grid-double">
          <label className="field">
            <span>Category</span>
            <select
              className="filter-select"
              value={draft.category}
              onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}
            >
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Library role</span>
            <select
              className="filter-select"
              value={draft.inclusion_type}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  inclusion_type: event.target.value as EssentialLibraryItemInput["inclusion_type"],
                }))
              }
            >
              {inclusionOptions.map((option) => (
                <option key={option} value={option}>
                  {formatEssentialInclusionType(option)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Notes</span>
          <textarea
            className="text-area-input"
            value={draft.notes}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Charged before flights, keep in handbag, refill before departure..."
          />
        </label>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      </form>
    </SlideOver>
  );
}
