import Link from "next/link";

import { StatusBadge } from "@/components/inventory/status-badge";
import { RemoteImage } from "@/components/ui/remote-image";
import { getDisplayImage, isUnavailableInventoryStatus } from "@/lib/inventory";
import type { InventoryItem } from "@/types/inventory";

type InventoryCardProps = {
  item: InventoryItem;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  onQuickEdit?: () => void;
  onStatusChange?: (status: "Returned" | "Discarded" | "Archived") => void;
};

export function InventoryCard({
  item,
  selected = false,
  onSelectChange,
  onQuickEdit,
  onStatusChange,
}: InventoryCardProps) {
  const imageUrl = getDisplayImage(item.image);
  const isUnavailable = isUnavailableInventoryStatus(item.status);

  return (
    <article className={`card inventory-card ${selected ? "is-selected" : ""} ${isUnavailable ? "is-unavailable" : ""}`}>
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
            <RemoteImage
              src={imageUrl}
              alt={item.item_name || item.item_id}
              className="card-image"
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
          <button type="button" className="ghost-button studio-mini-button inventory-action-button" onClick={onQuickEdit}>
            Edit item
          </button>
          {onStatusChange ? (
            <>
              <button
                type="button"
                className="ghost-button studio-mini-button inventory-action-button"
                onClick={() => onStatusChange("Returned")}
              >
                Returned
              </button>
              <button
                type="button"
                className="ghost-button studio-mini-button inventory-action-button"
                onClick={() => onStatusChange("Discarded")}
              >
                Discarded
              </button>
              <button
                type="button"
                className="ghost-button studio-mini-button inventory-action-button"
                onClick={() => onStatusChange("Archived")}
              >
                Archive
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
