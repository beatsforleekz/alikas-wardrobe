"use client";

import Link from "next/link";

import { formatTripDateRange, formatTripStatus, getTripDurationLabel } from "@/lib/travel";
import type { Trip } from "@/types/travel";

type TripCardProps = {
  trip: Trip;
  outfitCount: number;
  onEdit: () => void;
  onClose: () => void;
};

export function TripCard({ trip, outfitCount, onEdit, onClose }: TripCardProps) {
  const duration = getTripDurationLabel(trip.start_date, trip.end_date);
  const today = new Date().toISOString().slice(0, 10);
  const isTripOver = Boolean(trip.end_date && trip.end_date < today);
  const canCloseTrip = trip.status !== "completed" && trip.status !== "archived" && isTripOver;

  return (
    <article className="trip-card">
      <div className="trip-card-surface">
        <div className="trip-card-head">
          <p className="sku-label">Travel suite</p>
          <span className={`trip-status-pill status-${trip.status}`}>{formatTripStatus(trip.status)}</span>
        </div>

        <div className="trip-card-copy">
          <h2>{trip.title}</h2>
          <p className="trip-card-destination">{trip.destination || "Destination to be decided"}</p>
          <p className="trip-card-dates">{formatTripDateRange(trip.start_date, trip.end_date)}</p>
        </div>

        <div className="trip-card-meta">
          {duration ? <span className="trip-meta-pill">{duration}</span> : null}
          <span className="trip-meta-pill">
            {outfitCount} selected look{outfitCount === 1 ? "" : "s"}
          </span>
          {trip.baggage_limit ? <span className="trip-meta-pill">{trip.baggage_limit}</span> : null}
        </div>

        {trip.notes ? <p className="trip-card-notes">{trip.notes}</p> : null}

        <div className="trip-card-actions-row">
          <Link className="primary-button outfit-inline-action" href={`/travel/${trip.id}`}>
            Open trip
          </Link>
          <button type="button" className="ghost-button outfit-inline-action" onClick={onEdit}>
            Edit trip
          </button>
          {canCloseTrip ? (
            <button
              type="button"
              className="ghost-button outfit-inline-action danger-button"
              onClick={onClose}
            >
              Close trip
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
