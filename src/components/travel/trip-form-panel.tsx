"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { SlideOver } from "@/components/ui/slide-over";
import { TRIP_STATUS_OPTIONS, defaultTripInput } from "@/lib/travel";
import type { Trip, TripInput } from "@/types/travel";

type TripFormPanelProps = {
  open: boolean;
  trip: Trip | null;
  onClose: () => void;
  onSubmit: (input: TripInput, tripId?: string) => Promise<void>;
};

export function TripFormPanel({ open, trip, onClose, onSubmit }: TripFormPanelProps) {
  const [draft, setDraft] = useState<TripInput>(defaultTripInput);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const tripStatusOptions = useMemo(
    () => [...TRIP_STATUS_OPTIONS].sort((left, right) => left.localeCompare(right)),
    [],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    if (trip) {
      setDraft({
        title: trip.title,
        destination: trip.destination ?? "",
        notes: trip.notes ?? "",
        start_date: trip.start_date ?? "",
        end_date: trip.end_date ?? "",
        baggage_limit: trip.baggage_limit ?? "",
        baggage_notes: trip.baggage_notes ?? "",
        status: trip.status,
      });
      setErrorMessage("");
      return;
    }

    setDraft(defaultTripInput);
    setErrorMessage("");
  }, [open, trip]);

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!draft.title.trim()) {
      setErrorMessage("Add a trip title before saving.");
      return;
    }

    if (draft.start_date && draft.end_date && draft.end_date < draft.start_date) {
      setErrorMessage("End date must be the same as or later than the start date.");
      return;
    }

    startTransition(async () => {
      try {
        await onSubmit(draft, trip?.id);
        onClose();
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Unable to save trip.");
      }
    });
  }

  return (
    <SlideOver
      title={trip ? "Edit trip" : "New trip"}
      subtitle="Shape the trip first. Packing, essentials, and an optional capsule link can build naturally from here."
      open={open}
      onClose={onClose}
      footer={
        <button className="primary-button" type="submit" form="trip-form" disabled={isPending}>
          {isPending ? "Saving..." : trip ? "Save changes" : "Create trip"}
        </button>
      }
    >
      <form id="trip-form" className="editorial-form" onSubmit={submitForm}>
        <div className="editorial-form-grid editorial-form-grid-double">
          <label className="field">
            <span>Trip title</span>
            <input
              className="text-input"
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              placeholder="Barbados July"
              required
            />
          </label>

          <label className="field">
            <span>Status</span>
            <select
              className="filter-select"
              value={draft.status}
              onChange={(event) =>
                setDraft((current) => ({ ...current, status: event.target.value as TripInput["status"] }))
              }
            >
              {tripStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Destination</span>
            <input
              className="text-input"
              value={draft.destination}
              onChange={(event) =>
                setDraft((current) => ({ ...current, destination: event.target.value }))
              }
              placeholder="Barbados"
            />
          </label>

          <label className="field">
            <span>Baggage limit</span>
            <input
              className="text-input"
              value={draft.baggage_limit}
              onChange={(event) =>
                setDraft((current) => ({ ...current, baggage_limit: event.target.value }))
              }
              placeholder="23kg checked bag"
            />
          </label>

          <label className="field">
            <span>Start date</span>
            <input
              className="text-input"
              type="date"
              value={draft.start_date}
              onChange={(event) =>
                setDraft((current) => ({ ...current, start_date: event.target.value }))
              }
            />
          </label>

          <label className="field">
            <span>End date</span>
            <input
              className="text-input"
              type="date"
              value={draft.end_date}
              onChange={(event) => setDraft((current) => ({ ...current, end_date: event.target.value }))}
            />
          </label>
        </div>

        <label className="field">
          <span>Baggage notes</span>
          <textarea
            className="text-area-input"
            value={draft.baggage_notes}
            onChange={(event) =>
              setDraft((current) => ({ ...current, baggage_notes: event.target.value }))
            }
            placeholder="Cabin bag strategy, laundry expectations, weight notes..."
          />
        </label>

        <label className="field">
          <span>Trip notes</span>
          <textarea
            className="text-area-input"
            value={draft.notes}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Flights, events, capsule mood, weather notes..."
          />
        </label>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      </form>
    </SlideOver>
  );
}
