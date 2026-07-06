"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { StatusBadge } from "@/components/inventory/status-badge";
import { CollectionNav } from "@/components/navigation/collection-nav";
import { DetailGrid } from "@/components/ui/detail-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { getInventoryItemByItemId } from "@/lib/data/inventory";
import { formatValue, getDisplayImage, normalizeTravelFriendly } from "@/lib/inventory";
import { useWardrobeSession } from "@/hooks/use-wardrobe-session";
import type { InventoryItem } from "@/types/inventory";

export function InventoryDetailView({ itemId }: { itemId: string }) {
  const { supabase, session, isSessionLoading, handleLogin } = useWardrobeSession();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [isItemLoading, setIsItemLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadItem() {
      if (!session) {
        return;
      }

      setIsItemLoading(true);
      setErrorMessage("");

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

  const imageUrl = getDisplayImage(item.image);
  const tagList = item.tags
    ?.split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const metadata: Array<readonly [string, string]> = [
    ["Colour", formatValue(item.colour)],
    ["Season", formatValue(item.season)],
    ["Style type", formatValue(item.style_type)],
    ["Silhouette", formatValue(item.silhouette)],
    ["Vibe", formatValue(item.vibe)],
    ["Shoot level", formatValue(item.shoot_level)],
    ["Travel friendly", formatValue(item.travel_friendly)],
    ["Set name", formatValue(item.set_name)],
  ];

  return (
    <main className="page-shell">
      <CollectionNav />
      <div className="detail-header">
        <div className="detail-topbar">
          <Link className="back-link" href="/wardrobe">
            Back to wardrobe
          </Link>
        </div>
        <div className="detail-title-row">
          <div className="detail-title-copy">
            <p className="eyebrow">Wardrobe piece</p>
            <p className="sku-label detail-sku">{item.item_id}</p>
            <h1>{item.item_name || item.item_id}</h1>
            <div className="detail-meta-line">
              <span>{formatValue(item.category)}</span>
              <span className="meta-dot" aria-hidden="true" />
              <span>{formatValue(item.colour)}</span>
              {normalizeTravelFriendly(item.travel_friendly) ? (
                <>
                  <span className="meta-dot" aria-hidden="true" />
                  <span>{normalizeTravelFriendly(item.travel_friendly)} travel</span>
                </>
              ) : null}
            </div>
          </div>
          <StatusBadge status={item.status} />
        </div>
      </div>

      <section className="detail-layout">
        <article className="detail-media-card">
          {imageUrl ? (
            <div className="detail-image-wrap">
              <Image
                src={imageUrl}
                alt={item.item_name || item.item_id}
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
              {item.notes?.trim()
                ? item.notes
                : "A wardrobe record with styling metadata, seasonality, and collection details."}
            </p>
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
