import Image from "next/image";
import Link from "next/link";

import { StatusBadge } from "@/components/inventory/status-badge";
import { getDisplayImage } from "@/lib/inventory";
import type { InventoryItem } from "@/types/inventory";

type InventoryCardProps = {
  item: InventoryItem;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  onQuickEdit?: () => void;
};

export function InventoryCard({ item, selected = false, onSelectChange, onQuickEdit }: InventoryCardProps) {
  const imageUrl = getDisplayImage(item.image);

  return (
    <article className={`card inventory-card ${selected ? "is-selected" : ""}`}>
      <div className="inventory-card-select">
        {onSelectChange ? (
          <label className="selection-check">
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) => onSelectChange(event.target.checked)}
            />
            <span>Select</span>
          </label>
        ) : null}
      </div>

      <Link className="inventory-card-link" href={`/items/${encodeURIComponent(item.item_id)}`}>
        <div className="card-image-wrap">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.item_name || item.item_id}
              fill
              className="card-image"
              sizes="(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 25vw"
            />
          ) : (
            <div className="card-image-fallback">No image available</div>
          )}
        </div>

        <div className="inventory-card-body">
          <div className="inventory-card-copy">
            <span className="sku-label">{item.item_id}</span>
            <div className="inventory-card-header">
              <h2>{item.item_name || item.item_id}</h2>
              <StatusBadge status={item.status} />
            </div>
          </div>

          <div className="inventory-card-meta">
            <span className="meta-inline">{item.category || "Uncategorised"}</span>
            {item.colour ? <span className="meta-dot" aria-hidden="true" /> : null}
            {item.colour ? <span className="meta-inline">{item.colour}</span> : null}
          </div>
        </div>
      </Link>

      {onQuickEdit ? (
        <div className="inventory-card-actions">
          <button type="button" className="ghost-button" onClick={onQuickEdit}>
            Quick edit
          </button>
        </div>
      ) : null}
    </article>
  );
}
