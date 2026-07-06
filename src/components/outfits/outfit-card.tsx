import Image from "next/image";
import Link from "next/link";

import { getOutfitDisplayImage } from "@/lib/outfits";
import type { ValidatedOutfit } from "@/types/outfit";

type OutfitCardProps = {
  entry: ValidatedOutfit;
};

export function OutfitCard({ entry }: OutfitCardProps) {
  const imageUrl = getOutfitDisplayImage(entry.outfit);

  return (
    <Link className="outfit-card" href={`/outfits/${entry.outfit.id}`}>
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

      <div className="outfit-card-body">
        <p className="sku-label">Lookbook</p>
        <div className="outfit-card-header">
          <h2>{entry.outfit.title}</h2>
          <span className="outfit-count-pill">{entry.linkedItemCount} linked</span>
        </div>

        <div className="outfit-card-meta">
          {entry.outfit.occasion ? <span>{entry.outfit.occasion}</span> : null}
          {entry.outfit.capsule ? (
            <>
              {entry.outfit.occasion ? <span className="meta-dot" aria-hidden="true" /> : null}
              <span>{entry.outfit.capsule}</span>
            </>
          ) : null}
        </div>

        {entry.missingItemCount || entry.needsReviewCount ? (
          <div className="outfit-warning-row">
            {entry.missingItemCount ? (
              <span className="status-badge status-archived">
                {entry.missingItemCount} missing item{entry.missingItemCount > 1 ? "s" : ""}
              </span>
            ) : null}
            {entry.needsReviewCount ? (
              <span className="status-badge status-packed">
                {entry.needsReviewCount} needs review
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
