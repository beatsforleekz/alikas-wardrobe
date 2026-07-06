"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { StatusBadge } from "@/components/inventory/status-badge";
import { CollectionNav } from "@/components/navigation/collection-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { getInventoryItems } from "@/lib/data/inventory";
import { getOutfitById } from "@/lib/data/outfits";
import { getDisplayImage } from "@/lib/inventory";
import { getOutfitDisplayImage, groupOutfitItems, validateOutfit } from "@/lib/outfits";
import { useWardrobeSession } from "@/hooks/use-wardrobe-session";
import type { InventoryItem } from "@/types/inventory";
import type { Outfit } from "@/types/outfit";

export function OutfitDetailView({ outfitId }: { outfitId: string }) {
  const { supabase, session, isSessionLoading, handleLogin } = useWardrobeSession();
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      if (!session) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const [nextOutfit, nextInventory] = await Promise.all([
          getOutfitById(supabase, outfitId),
          getInventoryItems(supabase),
        ]);

        if (isActive) {
          setOutfit(nextOutfit);
          setInventoryItems(nextInventory);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load outfit.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isActive = false;
    };
  }, [outfitId, session, supabase]);

  const validatedOutfit = useMemo(
    () => (outfit ? validateOutfit(outfit, inventoryItems) : null),
    [inventoryItems, outfit],
  );

  const groupedItems = useMemo(
    () => (validatedOutfit ? groupOutfitItems(validatedOutfit.linkedItems) : []),
    [validatedOutfit],
  );

  if (isSessionLoading) {
    return <OutfitLoadingScreen title="Preparing your lookbook" message="Checking your wardrobe session..." />;
  }

  if (!session) {
    return <LoginForm onSubmit={handleLogin} />;
  }

  if (errorMessage) {
    return (
      <main className="page-shell">
        <CollectionNav />
        <section className="dashboard">
          <EmptyState title="Could not load outfit" description={errorMessage} />
        </section>
      </main>
    );
  }

  if (isLoading) {
    return <OutfitLoadingScreen title="Fetching outfit detail" message="Loading lookbook imagery and wardrobe links." />;
  }

  if (!validatedOutfit) {
    return (
      <main className="page-shell">
        <CollectionNav />
        <section className="dashboard">
          <EmptyState
            title="Outfit not found"
            description="This lookbook could not be found for the signed-in user."
          />
        </section>
      </main>
    );
  }

  const imageUrl = getOutfitDisplayImage(validatedOutfit.outfit);

  return (
    <main className="page-shell">
      <CollectionNav />

      <div className="detail-header">
        <div className="detail-topbar">
          <Link className="back-link" href="/outfits">
            Back to outfits
          </Link>
        </div>
        <div className="detail-title-row">
          <div className="detail-title-copy">
            <p className="eyebrow">Lookbook</p>
            <h1>{validatedOutfit.outfit.title}</h1>
            <div className="detail-meta-line">
              {validatedOutfit.outfit.occasion ? <span>{validatedOutfit.outfit.occasion}</span> : null}
              {validatedOutfit.outfit.capsule ? (
                <>
                  {validatedOutfit.outfit.occasion ? <span className="meta-dot" aria-hidden="true" /> : null}
                  <span>{validatedOutfit.outfit.capsule}</span>
                </>
              ) : null}
              <span className="meta-dot" aria-hidden="true" />
              <span>{validatedOutfit.linkedItemCount} linked items</span>
            </div>
          </div>
          {validatedOutfit.missingItemCount ? (
            <span className="status-badge status-archived">
              {validatedOutfit.missingItemCount} missing
            </span>
          ) : validatedOutfit.needsReviewCount ? (
            <span className="status-badge status-packed">
              {validatedOutfit.needsReviewCount} needs review
            </span>
          ) : (
            <span className="status-badge status-available">All linked</span>
          )}
        </div>
      </div>

      <section className="detail-layout">
        <article className="detail-media-card">
          {imageUrl ? (
            <div className="detail-image-wrap">
              <Image
                src={imageUrl}
                alt={validatedOutfit.outfit.title}
                fill
                className="detail-image"
                sizes="(max-width: 900px) 100vw, 46vw"
              />
            </div>
          ) : (
            <EmptyState
              title="No lookbook image available"
              description="This outfit does not currently have a lookbook image in Supabase."
              compact
            />
          )}
        </article>

        <div className="detail-column">
          <article className="detail-card detail-card-intro">
            <h2>Notes</h2>
            <p className="detail-description">
              {validatedOutfit.outfit.notes?.trim()
                ? validatedOutfit.outfit.notes
                : "No outfit notes have been added yet for this lookbook."}
            </p>
          </article>

          <article className="detail-card">
            <h2>Validation</h2>
            <div className="detail-chip-row">
              <span className="detail-chip">{validatedOutfit.linkedItemCount} linked item IDs</span>
              <span className="detail-chip">{validatedOutfit.missingItemCount} missing</span>
              <span className="detail-chip">{validatedOutfit.needsReviewCount} needs review</span>
            </div>
          </article>
        </div>
      </section>

      <section className="dashboard">
        <div className="results-copy">
          <p className="results-heading">Items Used</p>
        </div>

        {groupedItems.map((group) => (
          <section className="detail-card" key={group.groupLabel}>
            <div className="outfit-group-header">
              <h2>{group.groupLabel}</h2>
              <span className="sku-label">{group.items.length} item{group.items.length > 1 ? "s" : ""}</span>
            </div>
            <div className="outfit-linked-grid">
              {group.items.map((linkedItem, index) => {
                const item = linkedItem.inventoryItem;
                const itemImage = item ? getDisplayImage(item.image) : null;

                return (
                  <article className="linked-item-card" key={`${linkedItem.itemId}-${index}`}>
                    <div className="linked-item-head">
                      <div>
                        <p className="sku-label">{linkedItem.itemId}</p>
                        <h3>{item?.item_name || "Missing wardrobe item"}</h3>
                      </div>
                      {linkedItem.status === "confirmed" ? (
                        <span className="status-badge status-available">Confirmed</span>
                      ) : linkedItem.status === "missing_item" ? (
                        <span className="status-badge status-archived">Missing item</span>
                      ) : (
                        <span className="status-badge status-packed">Needs review</span>
                      )}
                    </div>

                    <div className="linked-item-body">
                      {itemImage ? (
                        <div className="linked-item-image-wrap">
                          <Image
                            src={itemImage}
                            alt={item?.item_name || linkedItem.itemId}
                            fill
                            className="linked-item-image"
                            sizes="120px"
                          />
                        </div>
                      ) : null}

                      <div className="linked-item-copy">
                        <p className="linked-item-meta">
                          {linkedItem.itemId} — {item?.item_name || "MISSING_ITEM"}
                        </p>
                        <p className="linked-item-meta">{linkedItem.categoryLabel}</p>
                        {linkedItem.notes ? <p className="linked-item-note">{linkedItem.notes}</p> : null}
                        {item ? (
                          <Link className="back-link linked-item-link" href={`/items/${encodeURIComponent(item.item_id)}`}>
                            View wardrobe item
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}

function OutfitLoadingScreen({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="page-shell">
      <CollectionNav />
      <section className="setup-notice">
        <p className="eyebrow">Loading</p>
        <h1>{title}</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}
