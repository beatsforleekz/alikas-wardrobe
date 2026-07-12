import Image from "next/image";
import Link from "next/link";

import {
  getOutfitDisplayImage,
  getOutfitIncompleteCount,
  hasUnavailableOutfitItems,
} from "@/lib/outfits";
import type { ValidatedOutfit } from "@/types/outfit";

type OutfitCardProps = {
  entry: ValidatedOutfit;
  viewMode?: "default" | "list" | "compact";
  onEdit?: () => void;
};

export function OutfitCard({ entry, onEdit, viewMode = "default" }: OutfitCardProps) {
  const imageUrl = getOutfitDisplayImage(entry.outfit);
  const hasUnavailableItems = hasUnavailableOutfitItems(entry);
  const incompleteCount = getOutfitIncompleteCount(entry);
  const tagLabels = [
    entry.outfit.occasion,
    entry.outfit.trip || entry.outfit.capsule,
    ...entry.outfit.tags,
  ].filter(Boolean);

  return (
    <article className={`outfit-card outfit-card-${viewMode}`}>
      <div className="outfit-card-link">
        <div className="outfit-card-body outfit-card-body-top">
          <div className="outfit-card-headline-row">
            <p className="sku-label">Lookbook</p>
          </div>

          <Link className="outfit-card-copy-link" href={`/outfits/${entry.outfit.id}`}>
            <div className="outfit-card-header">
              <h2>{entry.outfit.title}</h2>
            </div>
          </Link>
        </div>

        <Link className="outfit-card-image-link" href={`/outfits/${entry.outfit.id}`}>
          <div className="outfit-card-image-wrap">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={entry.outfit.title}
                fill
                className="outfit-card-image"
                sizes="(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 25vw"
              />
            ) : (
              <div className="card-image-fallback">No outfit image available</div>
            )}
          </div>
        </Link>

        <div className="outfit-card-body">
          <Link className="outfit-card-copy-link" href={`/outfits/${entry.outfit.id}`}>
            {tagLabels.length > 0 ? (
              <div className="outfit-card-meta">
                {tagLabels.map((label, index) => (
                  <span key={`${label}-${index}`}>{label}</span>
                ))}
              </div>
            ) : null}

            {hasUnavailableItems || entry.needsReviewCount ? (
              <div className="outfit-warning-row">
                {hasUnavailableItems ? (
                  <span className="status-badge status-returned">Incomplete</span>
                ) : null}
                {hasUnavailableItems ? (
                  <span className="detail-chip">
                    {incompleteCount} unavailable item{incompleteCount === 1 ? "" : "s"}
                  </span>
                ) : null}
                {entry.missingItemCount ? (
                  <span className="status-badge status-archived">
                    {entry.missingItemCount} missing item{entry.missingItemCount > 1 ? "s" : ""}
                  </span>
                ) : null}
                {entry.unavailableItemCount ? (
                  <span className="status-badge status-discarded">
                    {entry.unavailableItemCount} unavailable
                  </span>
                ) : null}
                {entry.needsReviewCount ? (
                  <span className="status-badge status-packed">
                    {entry.needsReviewCount} needs review
                  </span>
                ) : null}
              </div>
            ) : null}
          </Link>

          <div className="outfit-card-actions-row">
            <Link className="back-link" href={`/outfits/${entry.outfit.id}`}>
              Open lookbook
            </Link>
            {onEdit ? (
              <button type="button" className="ghost-button outfit-inline-action" onClick={onEdit}>
                Edit Lookbook
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
