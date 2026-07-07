"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { CollectionNav } from "@/components/navigation/collection-nav";
import { BrandedLoadingScreen } from "@/components/ui/branded-loading-screen";
import { WishlistFormPanel } from "@/components/wishlist/wishlist-form-panel";
import { useWardrobeSession } from "@/hooks/use-wardrobe-session";
import { getInventoryItems } from "@/lib/data/inventory";
import { getOutfits } from "@/lib/data/outfits";
import { getTrips } from "@/lib/data/travel";
import {
  createWishlistItem,
  deleteWishlistItem,
  getWishlistItemOutfitLinks,
  getWishlistItemTripLinks,
  getWishlistItems,
  updateWishlistItem,
} from "@/lib/data/wishlist";
import {
  EMPTY_WISHLIST_ITEM_INPUT,
  formatWishlistEntryType,
  formatWishlistStatus,
  getWishlistPriorityLabel,
} from "@/lib/wishlist";
import type { InventoryItem } from "@/types/inventory";
import type { Outfit } from "@/types/outfit";
import type { Trip } from "@/types/travel";
import type {
  WishlistItem,
  WishlistItemInput,
  WishlistItemOutfitLink,
  WishlistItemTripLink,
} from "@/types/wishlist";

type DecoratedWishlistItem = {
  item: WishlistItem;
  relatedOutfits: Outfit[];
  relatedTrips: Trip[];
};

export function WishlistApp() {
  const { supabase, session, isSessionLoading, handleLogin } = useWardrobeSession();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [outfitLinks, setOutfitLinks] = useState<WishlistItemOutfitLink[]>([]);
  const [tripLinks, setTripLinks] = useState<WishlistItemTripLink[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null);
  const [initialDraft, setInitialDraft] = useState<WishlistItemInput | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      if (!session) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const [
          nextItems,
          nextOutfitLinks,
          nextTripLinks,
          nextOutfits,
          nextTrips,
          nextInventoryItems,
        ] = await Promise.all([
          getWishlistItems(supabase),
          getWishlistItemOutfitLinks(supabase),
          getWishlistItemTripLinks(supabase),
          getOutfits(supabase),
          getTrips(supabase),
          getInventoryItems(supabase),
        ]);

        if (!isActive) {
          return;
        }

        setItems(nextItems);
        setOutfitLinks(nextOutfitLinks);
        setTripLinks(nextTripLinks);
        setOutfits(nextOutfits);
        setTrips(nextTrips);
        setInventoryItems(nextInventoryItems);
      } catch (error) {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load wishlist.");
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
  }, [session, supabase]);

  const decoratedItems = useMemo(() => {
    const outfitMap = new Map(outfits.map((outfit) => [outfit.id, outfit]));
    const tripMap = new Map(trips.map((trip) => [trip.id, trip]));
    const outfitIdsByItemId = new Map<string, string[]>();
    const tripIdsByItemId = new Map<string, string[]>();

    for (const link of outfitLinks) {
      outfitIdsByItemId.set(link.wishlist_item_id, [
        ...(outfitIdsByItemId.get(link.wishlist_item_id) ?? []),
        link.outfit_id,
      ]);
    }

    for (const link of tripLinks) {
      tripIdsByItemId.set(link.wishlist_item_id, [
        ...(tripIdsByItemId.get(link.wishlist_item_id) ?? []),
        link.trip_id,
      ]);
    }

    return items.map((item) => ({
      item,
      relatedOutfits: (outfitIdsByItemId.get(item.id) ?? [])
        .map((outfitId) => outfitMap.get(outfitId))
        .filter(Boolean) as Outfit[],
      relatedTrips: (tripIdsByItemId.get(item.id) ?? [])
        .map((tripId) => tripMap.get(tripId))
        .filter(Boolean) as Trip[],
    }));
  }, [items, outfitLinks, tripLinks, outfits, trips]);

  const categorySuggestions = useMemo(
    () =>
      [...new Set([
        ...inventoryItems.map((inventoryItem) => inventoryItem.category?.trim()),
        ...items.map((item) => item.category?.trim()),
      ].filter(Boolean) as string[])].sort((left, right) => left.localeCompare(right)),
    [inventoryItems, items],
  );

  const activeItems = useMemo(
    () => decoratedItems.filter(({ item }) => item.status !== "bought" && item.status !== "skipped"),
    [decoratedItems],
  );

  const priorityItems = useMemo(
    () => activeItems.filter(({ item }) => item.priority_rating >= 4),
    [activeItems],
  );

  const wishlistQueue = useMemo(
    () => activeItems.filter(({ item }) => item.entry_type === "wishlist"),
    [activeItems],
  );

  const tripRelatedItems = useMemo(
    () => activeItems.filter((entry) => entry.relatedTrips.length > 0),
    [activeItems],
  );

  const outfitRelatedItems = useMemo(
    () => activeItems.filter((entry) => entry.relatedOutfits.length > 0),
    [activeItems],
  );

  const gapAnalysisItems = useMemo(
    () => activeItems.filter(({ item }) => item.entry_type === "gap_analysis"),
    [activeItems],
  );

  const archiveItems = useMemo(
    () => decoratedItems.filter(({ item }) => item.status === "bought" || item.status === "skipped"),
    [decoratedItems],
  );

  const linkedOutfitIds = useMemo(
    () => (editingItem ? outfitLinks.filter((link) => link.wishlist_item_id === editingItem.id).map((link) => link.outfit_id) : []),
    [editingItem, outfitLinks],
  );

  const linkedTripIds = useMemo(
    () => (editingItem ? tripLinks.filter((link) => link.wishlist_item_id === editingItem.id).map((link) => link.trip_id) : []),
    [editingItem, tripLinks],
  );

  async function refreshWishlistState() {
    const [nextItems, nextOutfitLinks, nextTripLinks] = await Promise.all([
      getWishlistItems(supabase),
      getWishlistItemOutfitLinks(supabase),
      getWishlistItemTripLinks(supabase),
    ]);

    setItems(nextItems);
    setOutfitLinks(nextOutfitLinks);
    setTripLinks(nextTripLinks);
  }

  async function handleSubmit(input: WishlistItemInput, itemId?: string) {
    if (!session) {
      return;
    }

    setNotice("");
    setErrorMessage("");

    if (itemId) {
      await updateWishlistItem(supabase, session.user.id, itemId, input);
      await refreshWishlistState();
      setNotice(`${input.item_name.trim()} updated.`);
      return;
    }

    await createWishlistItem(supabase, session.user.id, input);
    await refreshWishlistState();
    setNotice(`${input.item_name.trim()} added to ${formatWishlistEntryType(input.entry_type)}.`);
  }

  async function handleDelete(item: WishlistItem) {
    setNotice("");
    setErrorMessage("");
    await deleteWishlistItem(supabase, item.id);
    await refreshWishlistState();
    setNotice(`${item.item_name} removed.`);
  }

  function handleAddWishlist() {
    setEditingItem(null);
    setInitialDraft(EMPTY_WISHLIST_ITEM_INPUT);
  }

  function handleAddGapItem() {
    setEditingItem(null);
    setInitialDraft({
      ...EMPTY_WISHLIST_ITEM_INPUT,
      entry_type: "gap_analysis",
      status: "to_buy",
      priority_rating: 4,
    });
  }

  function handleEditItem(item: WishlistItem) {
    setInitialDraft(null);
    setEditingItem(item);
  }

  function handleClosePanel() {
    setEditingItem(null);
    setInitialDraft(null);
  }

  if (isSessionLoading) {
    return <BrandedLoadingScreen title="Preparing your wardrobe" />;
  }

  if (!session) {
    return <LoginForm onSubmit={handleLogin} />;
  }

  return (
    <main className="page-shell">
      <CollectionNav />

      <header className="page-header wishlist-page-header">
        <div className="wishlist-page-title">
          <h1 className="page-title">Wishlist</h1>
          <p>Track what to buy, why it matters, and where it unlocks the wardrobe.</p>
        </div>

        <div className="wishlist-header-actions">
          <button type="button" className="ghost-button" onClick={handleAddGapItem}>
            Add gap item
          </button>
          <button type="button" className="primary-button" onClick={handleAddWishlist}>
            Add wishlist item
          </button>
        </div>
      </header>

      <section className="dashboard wishlist-dashboard">
        {notice ? (
          <section className="setup-notice">
            <p className="results-heading">Wishlist updated</p>
            <p>{notice}</p>
          </section>
        ) : null}

        {errorMessage ? (
          <section className="dashboard-card wishlist-empty-card">
            <p className="results-heading">Could not load wishlist</p>
            <p>{errorMessage}</p>
          </section>
        ) : isLoading ? (
          <BrandedLoadingScreen title="Preparing your wardrobe" />
        ) : items.length === 0 ? (
          <section className="dashboard-card wishlist-empty-card">
            <p className="eyebrow">Wishlist</p>
            <h2>Start building your wishlist.</h2>
            <p>
              Capture missing wardrobe pieces, manual gap-analysis ideas, and the trips or lookbooks
              they would improve.
            </p>
            <div className="wishlist-header-actions">
              <button type="button" className="ghost-button" onClick={handleAddGapItem}>
                Add gap item
              </button>
              <button type="button" className="primary-button" onClick={handleAddWishlist}>
                Add wishlist item
              </button>
            </div>
          </section>
        ) : (
          <>
            <section className="wishlist-summary-row">
              <SummaryCard label="Active wishlist" value={`${wishlistQueue.length}`} />
              <SummaryCard label="Priority now" value={`${priorityItems.length}`} />
              <SummaryCard label="Trip-linked" value={`${tripRelatedItems.length}`} />
              <SummaryCard label="Lookbook-linked" value={`${outfitRelatedItems.length}`} />
              <SummaryCard label="Archive" value={`${archiveItems.length}`} />
            </section>

            <WishlistSection
              title="Priority items"
              description="The pieces with the clearest wardrobe payoff right now."
              items={priorityItems}
              emptyMessage="No priority items yet."
              onEdit={handleEditItem}
            />

            <WishlistSection
              title="Wishlist queue"
              description="Ideas and To Buy pieces across the broader wardrobe."
              items={wishlistQueue}
              emptyMessage="No active wishlist items yet."
              onEdit={handleEditItem}
            />

            <WishlistSection
              title="Trip-related items"
              description="Pieces linked to upcoming travel planning."
              items={tripRelatedItems}
              emptyMessage="No trip-linked wishlist items yet."
              onEdit={handleEditItem}
            />

            <WishlistSection
              title="Outfit-related items"
              description="Pieces tied directly to lookbooks you want to improve."
              items={outfitRelatedItems}
              emptyMessage="No lookbook-linked wishlist items yet."
              onEdit={handleEditItem}
            />

            <WishlistSection
              title="Gap Analysis"
              description="Manual wardrobe recommendations with a clear reason to exist."
              items={gapAnalysisItems}
              emptyMessage="No gap-analysis entries yet."
              onEdit={handleEditItem}
            />

            <WishlistSection
              title="Bought & skipped archive"
              description="A calm history of what made it in and what no longer matters."
              items={archiveItems}
              emptyMessage="Nothing archived yet."
              onEdit={handleEditItem}
            />
          </>
        )}
      </section>

      <WishlistFormPanel
        open={Boolean(editingItem) || Boolean(initialDraft)}
        item={editingItem}
        initialDraft={initialDraft}
        categorySuggestions={categorySuggestions}
        outfits={outfits}
        trips={trips}
        linkedOutfitIds={linkedOutfitIds}
        linkedTripIds={linkedTripIds}
        onClose={handleClosePanel}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
      />
    </main>
  );
}

function WishlistSection({
  title,
  description,
  items,
  emptyMessage,
  onEdit,
}: {
  title: string;
  description: string;
  items: DecoratedWishlistItem[];
  emptyMessage: string;
  onEdit: (item: WishlistItem) => void;
}) {
  return (
    <section className="dashboard-card wishlist-section-card">
      <div className="wishlist-section-head">
        <div>
          <p className="results-heading">{title}</p>
          <p>{description}</p>
        </div>
        <span className="detail-chip">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="wishlist-section-empty">{emptyMessage}</p>
      ) : (
        <div className="wishlist-grid">
          {items.map((entry) => (
            <WishlistCard key={entry.item.id} entry={entry} onEdit={() => onEdit(entry.item)} />
          ))}
        </div>
      )}
    </section>
  );
}

function WishlistCard({
  entry,
  onEdit,
}: {
  entry: DecoratedWishlistItem;
  onEdit: () => void;
}) {
  const { item, relatedOutfits, relatedTrips } = entry;

  return (
    <article className="wishlist-card">
      <div className="wishlist-card-media">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.item_name}
            fill
            className="wishlist-card-image"
            sizes="(max-width: 700px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : (
          <div className="wishlist-card-placeholder">
            <span>{formatWishlistEntryType(item.entry_type)}</span>
          </div>
        )}
      </div>

      <div className="wishlist-card-body">
        <div className="wishlist-card-topline">
          <p className="sku-label">{formatWishlistEntryType(item.entry_type)}</p>
          <span className={`wishlist-status-pill wishlist-status-${item.status}`}>{formatWishlistStatus(item.status)}</span>
        </div>

        <div className="wishlist-card-title-row">
          <h3>{item.item_name}</h3>
          <span className="detail-chip">{getWishlistPriorityLabel(item.priority_rating)}</span>
        </div>

        <div className="wishlist-card-meta">
          {item.category ? <span>{item.category}</span> : null}
          {item.colour_material ? <span>{item.colour_material}</span> : null}
        </div>

        {item.reason ? <p className="wishlist-card-copy">{item.reason}</p> : null}

        <div className="detail-chip-row">
          <span className="detail-chip">{item.estimated_outfits_improved} outfits improved</span>
          {relatedTrips.length ? <span className="detail-chip">{relatedTrips.length} trip linked</span> : null}
          {relatedOutfits.length ? <span className="detail-chip">{relatedOutfits.length} lookbook linked</span> : null}
        </div>

        {relatedOutfits.length ? (
          <div className="wishlist-related-block">
            <p className="eyebrow">Related lookbooks</p>
            <div className="wishlist-related-links">
              {relatedOutfits.map((outfit) => (
                <Link key={outfit.id} href={`/outfits/${outfit.id}`} className="wishlist-related-link">
                  {outfit.title}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {relatedTrips.length ? (
          <div className="wishlist-related-block">
            <p className="eyebrow">Related trips</p>
            <div className="wishlist-related-links">
              {relatedTrips.map((trip) => (
                <Link key={trip.id} href={`/travel/${trip.id}`} className="wishlist-related-link">
                  {trip.title}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {item.notes ? <p className="wishlist-card-notes">{item.notes}</p> : null}

        <div className="wishlist-card-actions">
          {item.link_url ? (
            <a href={item.link_url} target="_blank" rel="noreferrer" className="back-link">
              Open reference
            </a>
          ) : <span />}
          <button type="button" className="ghost-button studio-mini-button" onClick={onEdit}>
            Edit
          </button>
        </div>
      </div>
    </article>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="wishlist-summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
