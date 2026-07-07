"use client";

import { useEffect, useState } from "react";

import {
  getTravelCapsuleLink,
  isLikelyTravelCapsuleUrl,
  setTravelCapsuleLink,
} from "@/lib/travel-capsule";

export function TravelCapsuleField({
  tripId,
  title = "Linked capsule",
  description = "Optional reference for the capsule, PDF, folder, or planning link tied to this trip.",
  compact = false,
}: {
  tripId: string;
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  const [value, setValue] = useState("");
  const [savedValue, setSavedValue] = useState("");

  useEffect(() => {
    const nextValue = tripId ? getTravelCapsuleLink(tripId) : "";
    setValue(nextValue);
    setSavedValue(nextValue);
  }, [tripId]);

  if (!tripId) {
    return null;
  }

  const isUrl = isLikelyTravelCapsuleUrl(savedValue);

  return (
    <article className={`detail-card travel-capsule-card ${compact ? "is-compact" : ""}`}>
      <div className="results-bar">
        <div className="results-copy">
          <p className="results-heading">{title}</p>
          <p>{description}</p>
        </div>
      </div>

      <div className="travel-capsule-form">
        <input
          className="text-input"
          value={value}
          placeholder="Paste an optional capsule link or note"
          onChange={(event) => setValue(event.target.value)}
        />
        <div className="travel-capsule-actions">
          <button
            type="button"
            className="primary-button studio-mini-button"
            onClick={() => {
              setTravelCapsuleLink(tripId, value);
              const nextValue = value.trim();
              setValue(nextValue);
              setSavedValue(nextValue);
            }}
          >
            Save link
          </button>
          {savedValue ? (
            <button
              type="button"
              className="ghost-button studio-mini-button"
              onClick={() => {
                setTravelCapsuleLink(tripId, "");
                setValue("");
                setSavedValue("");
              }}
            >
              Clear
            </button>
          ) : null}
          {savedValue && isUrl ? (
            <a
              className="ghost-button studio-mini-button"
              href={savedValue}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </a>
          ) : null}
        </div>
      </div>

      {savedValue && !isUrl ? <p className="detail-description">{savedValue}</p> : null}
    </article>
  );
}
