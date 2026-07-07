"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { InternalBackButton } from "@/components/navigation/internal-back-button";
import { StatusBadge } from "@/components/inventory/status-badge";
import { CollectionNav } from "@/components/navigation/collection-nav";
import { DetailGrid } from "@/components/ui/detail-grid";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getInventoryItemByItemId,
  updateInventoryItemStatus,
} from "@/lib/data/inventory";
import { createWishlistItem } from "@/lib/data/wishlist";
import {
  formatValue,
  getDisplayImage,
  isUnavailableInventoryStatus,
  normalizeTravelFriendly,
} from "@/lib/inventory";
import { useWardrobeSession } from "@/hooks/use-wardrobe-session";
import type { InventoryItem } from "@/types/inventory";
import type { WishlistItemInput } from "@/types/wishlist";

export function InventoryDetailView({ itemId }: { itemId: string }) {
  const { supabase, session, isSessionLoading, handleLogin } = useWardrobeSession();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [isItemLoading, setIsItemLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadItem() {
      if (!session) {
        return;
      }

      setIsItemLoading(true);
      setErrorMessage("");
      setNotice("");

      try {
        const nextItem = await getInventoryItemByItemId(supabase, itemId);

        if (isActive) {
          setItem(nextItem);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load inventory item.",
          );
        }
      } finally {
        if (isActive) {
          setIsItemLoading(false);
        }
      }
    }

    void loadItem();

    return () => {
      isActive = false;
    };
  }, [itemId, session, supabase]);

  if (isSessionLoading) {
    return (
      <main className="page-shell">
        <CollectionNav />
        <section className="setup-notice">
          <p className="eyebrow">Loading</p>
          <h1>Checking your wardrobe session</h1>
          <p>Authenticating before loading this inventory item.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return <LoginForm onSubmit={handleLogin} />;
  }

  if (isItemLoading) {
    return (
      <main className="page-shell">
        <CollectionNav />
        <section className="setup-notice">
          <p className="eyebrow">Loading</p>
          <h1>Fetching item details</h1>
          <p>Loading this inventory item through your active Supabase session.</p>
        </section>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="page-shell">
        <CollectionNav />
        <section className="dashboard">
          <EmptyState title="Could not load item" description={errorMessage} />
        </section>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="page-shell">
        <CollectionNav />
        <section className="dashboard">
          <EmptyState
            title="Item not found"
            description="This inventory item was not returned by Supabase for the signed-in user."
          />
        </section>
      </main>
    );
  }

  const currentItem = item;
  const imageUrl = getDisplayImage(currentItem.image);
  const isUnavailable = isUnavailableInventoryStatus(currentItem.status);
  const tagList = currentItem.tags
    ?.split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const metadata: Array<readonly [string, string]> = [
    ["Colour", formatValue(currentItem.colour)],
    ["Season", formatValue(currentItem.season)],
    ["Style type", formatValue(currentItem.style_type)],
    ["Silhouette", formatValue(currentItem.silhouette)],
    ["Vibe", formatValue(currentItem.vibe)],
    ["Shoot level", formatValue(currentItem.shoot_level)],
    ["Travel friendly", formatValue(currentItem.travel_friendly)],
    ["Set name", formatValue(currentItem.set_name)],
  ];

  async function handleStatusChange(status: "Returned" | "Discarded" | "Archived") {
    const updated = await updateInventoryItemStatus(supabase, currentItem.id, status);
    setItem(updated);
    setNotice(`${updated.item_id} marked ${status.toLowerCase()}.`);
  }

  async function handleMoveReplacementToWishlist() {
    if (!session) {
      return;
    }

    const replacementDraft: WishlistItemInput = {
      entry_type: "wishlist",
      item_name: currentItem.item_name || currentItem.item_id,
      category: currentItem.category ?? "",
      colour_material: currentItem.colour ?? "",
      reason: `Replacement for ${currentItem.item_id} (${currentItem.status ?? "Unavailable"}).`,
      priority_rating: 4,
      status: "to_buy",
      estimated_outfits_improved: 0,
      notes: currentItem.notes ?? "",
      link_url: "",
      image_url: "",
      related_outfit_ids: [],
      related_trip_ids: [],
    };

    await createWishlistItem(supabase, session.user.id, replacementDraft);
    setNotice(`${currentItem.item_id} replacement added to Wishlist.`);
  }

  return (
    <main className="page-shell">
      <CollectionNav />
      <InternalBackButton href="/wardrobe" label="Back to wardrobe" />
      {notice ? (
        <section className="setup-notice">
          <p className="results-heading">Wardrobe updated</p>
          <p>{notice}</p>
        </section>
      ) : null}
      <div className="detail-header">
        <div className="detail-title-row">
          <div className="detail-title-copy">
            <p className="eyebrow">Wardrobe piece</p>
            <p className="sku-label detail-sku">{currentItem.item_id}</p>
            <h1>{currentItem.item_name || currentItem.item_id}</h1>
            <div className="detail-meta-line">
              <span>{formatValue(currentItem.category)}</span>
              <span className="meta-dot" aria-hidden="true" />
              <span>{formatValue(currentItem.colour)}</span>
              {normalizeTravelFriendly(currentItem.travel_friendly) ? (
                <>
                  <span className="meta-dot" aria-hidden="true" />
                  <span>{normalizeTravelFriendly(currentItem.travel_friendly)} travel</span>
                </>
              ) : null}
            </div>
          </div>
          <StatusBadge status={currentItem.status} />
        </div>
      </div>

      <section className="detail-layout">
        <article className={`detail-media-card ${isUnavailable ? "is-unavailable" : ""}`}>
          {imageUrl ? (
            <div className="detail-image-wrap">
              <Image
                src={imageUrl}
                alt={currentItem.item_name || currentItem.item_id}
                fill
                className="detail-image"
                sizes="(max-width: 900px) 100vw, 40vw"
              />
            </div>
          ) : (
            <EmptyState
              title="No image available"
              description="This inventory item does not currently have an image URL in Supabase."
              compact
            />
          )}
        </article>

        <div className="detail-column">
          <article className="detail-card detail-card-intro">
            <h2>At a glance</h2>
            <p className="detail-description">
              {currentItem.notes?.trim()
                ? currentItem.notes
                : "A wardrobe record with styling metadata, seasonality, and collection details."}
            </p>
            {isUnavailable ? (
              <p className="detail-warning-copy">This item is no longer available for new outfits or packing.</p>
            ) : null}
            <div className="inventory-status-actions">
              <button type="button" className="ghost-button" onClick={() => void handleStatusChange("Returned")}>
                Mark returned
              </button>
              <button type="button" className="ghost-button" onClick={() => void handleStatusChange("Discarded")}>
                Mark discarded
              </button>
              <button type="button" className="ghost-button" onClick={() => void handleStatusChange("Archived")}>
                Archive
              </button>
              {currentItem.status?.trim() === "Returned" ? (
                <button type="button" className="primary-button" onClick={() => void handleMoveReplacementToWishlist()}>
                  Move replacement to Wishlist
                </button>
              ) : null}
            </div>
          </article>

          {tagList?.length ? (
            <article className="detail-card">
              <h2>Tags</h2>
              <div className="detail-chip-row">
                {tagList.map((tag) => (
                  <span className="detail-chip" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ) : null}

          <article className="detail-card">
            <h2>Details</h2>
            <DetailGrid rows={metadata} />
          </article>
        </div>
      </section>
    </main>
  );
}
