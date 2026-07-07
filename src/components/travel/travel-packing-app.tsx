"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { CollectionNav } from "@/components/navigation/collection-nav";
import { InternalBackButton } from "@/components/navigation/internal-back-button";
import { TravelCataloguePanel } from "@/components/travel/travel-catalogue-panel";
import { TravelShellNav } from "@/components/travel/travel-shell-nav";
import { BrandedLoadingScreen } from "@/components/ui/branded-loading-screen";
import { EmptyState } from "@/components/ui/empty-state";
import { getInventoryItems } from "@/lib/data/inventory";
import { getOutfits } from "@/lib/data/outfits";
import {
  addTripOutfitLink,
  createTripEssentialItems,
  deleteTripOutfitLink,
  deleteTripWardrobeItemOutfitLinks,
  deleteTripWardrobeItems,
  getEssentialLibraryItems,
  getTripOutfitLinks,
  getTripEssentialItems,
  getTrips,
  getTripWardrobeItemOutfitLinks,
  getTripWardrobeItems,
  updateTripEssentialItem,
  upsertTripWardrobeItemOutfitLinks,
  upsertTripWardrobeItems,
} from "@/lib/data/travel";
import { getDisplayImage, normalizeText } from "@/lib/inventory";
import { formatEssentialInclusionType, formatTripDateRange } from "@/lib/travel";
import { useWardrobeSession } from "@/hooks/use-wardrobe-session";
import type { InventoryItem } from "@/types/inventory";
import type { Outfit } from "@/types/outfit";
import type {
  EssentialLibraryItem,
  Trip,
  TripEssentialItem,
  TripOutfitLink,
  TripWardrobeItem,
  TripWardrobeItemOutfitLink,
} from "@/types/travel";

type TravelPackingAppProps = {
  initialTripId?: string;
};

export function TravelPackingApp({ initialTripId = "" }: TravelPackingAppProps) {
  const { supabase, session, isSessionLoading, handleLogin } = useWardrobeSession();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [tripLinks, setTripLinks] = useState<TripOutfitLink[]>([]);
  const [wardrobeItems, setWardrobeItems] = useState<TripWardrobeItem[]>([]);
  const [wardrobeItemLinks, setWardrobeItemLinks] = useState<TripWardrobeItemOutfitLink[]>([]);
  const [essentialLibraryItems, setEssentialLibraryItems] = useState<EssentialLibraryItem[]>([]);
  const [tripEssentialItems, setTripEssentialItems] = useState<TripEssentialItem[]>([]);
  const [selectedTripId, setSelectedTripId] = useState(initialTripId);
  const [lookbookQuery, setLookbookQuery] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadBase() {
      if (!session) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const [nextTrips, nextOutfits, nextInventory, nextTripLinks, nextLibraryItems] = await Promise.all([
          getTrips(supabase),
          getOutfits(supabase),
          getInventoryItems(supabase),
          getTripOutfitLinks(supabase),
          getEssentialLibraryItems(supabase),
        ]);

        if (!isActive) {
          return;
        }

        setTrips(nextTrips);
        setOutfits(nextOutfits);
        setInventoryItems(nextInventory);
        setTripLinks(nextTripLinks);
        setEssentialLibraryItems(nextLibraryItems.filter((item) => !item.is_archived));

        const resolvedTripId =
          nextTrips.find((trip) => trip.id === initialTripId)?.id ??
          nextTrips[0]?.id ??
          "";

        setSelectedTripId((current) => current || resolvedTripId);
      } catch (error) {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load packing.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadBase();

    return () => {
      isActive = false;
    };
  }, [initialTripId, session, supabase]);

  useEffect(() => {
    let isActive = true;

    async function loadTripPacking() {
      if (!session || !selectedTripId) {
        if (isActive) {
          setWardrobeItems([]);
          setWardrobeItemLinks([]);
          setTripEssentialItems([]);
        }
        return;
      }

      try {
        const [nextWardrobeItems, nextWardrobeLinks, currentTripEssentials] = await Promise.all([
          getTripWardrobeItems(supabase, selectedTripId),
          getTripWardrobeItemOutfitLinks(supabase, selectedTripId),
          getTripEssentialItems(supabase, selectedTripId),
        ]);

        let resolvedTripEssentials = currentTripEssentials;

        if (currentTripEssentials.length === 0 && essentialLibraryItems.length > 0) {
          resolvedTripEssentials = await createTripEssentialItems(
            supabase,
            essentialLibraryItems.map((item, index) => ({
              trip_id: selectedTripId,
              user_id: session.user.id,
              source_library_item_id: item.id,
              title: item.title,
              category: item.category,
              inclusion_type: item.inclusion_type,
              packing_status: "pending",
              notes: item.notes,
              sort_order: index,
            })),
          );
        }

        if (isActive) {
          setWardrobeItems(nextWardrobeItems);
          setWardrobeItemLinks(nextWardrobeLinks);
          setTripEssentialItems(resolvedTripEssentials);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load packed wardrobe items.");
        }
      }
    }

    void loadTripPacking();

    return () => {
      isActive = false;
    };
  }, [essentialLibraryItems, selectedTripId, session, supabase]);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? null,
    [selectedTripId, trips],
  );
  const selectedTripLinks = useMemo(
    () => tripLinks.filter((link) => link.trip_id === selectedTripId),
    [selectedTripId, tripLinks],
  );
  const selectedOutfits = useMemo(
    () =>
      selectedTripLinks
        .map((link) => outfits.find((outfit) => outfit.id === link.outfit_id) ?? null)
        .filter((outfit): outfit is Outfit => Boolean(outfit)),
    [outfits, selectedTripLinks],
  );
  const availableOutfits = useMemo(() => {
    const linkedOutfitIds = new Set(selectedTripLinks.map((link) => link.outfit_id));
    const normalizedQuery = normalizeText(lookbookQuery);

    return outfits.filter((outfit) => {
      if (linkedOutfitIds.has(outfit.id)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [outfit.title, outfit.trip, outfit.occasion, outfit.tags.join(" ")]
        .filter(Boolean)
        .some((field) => normalizeText(field).includes(normalizedQuery));
    });
  }, [lookbookQuery, outfits, selectedTripLinks]);
  const wardrobeEntries = useMemo(() => {
    const outfitMap = new Map(outfits.map((outfit) => [outfit.id, outfit]));
    const inventoryMap = new Map(inventoryItems.map((item) => [item.item_id, item]));

    return wardrobeItems
      .map((entry) => {
        const inventoryItem = inventoryMap.get(entry.wardrobe_item_id) ?? null;
        const linkedOutfitIds = wardrobeItemLinks
          .filter((link) => link.trip_wardrobe_item_id === entry.id)
          .map((link) => link.trip_outfit_id);
        const usedInOutfits = linkedOutfitIds
          .map((linkId) => {
            const tripLink = selectedTripLinks.find((entryLink) => entryLink.id === linkId);
            if (!tripLink) {
              return null;
            }

            return outfitMap.get(tripLink.outfit_id) ?? null;
          })
          .filter((outfit): outfit is Outfit => Boolean(outfit));

        return {
          row: entry,
          inventoryItem,
          usedInOutfits,
        };
      })
      .sort((left, right) => left.row.sort_order - right.row.sort_order);
  }, [inventoryItems, outfits, selectedTripLinks, wardrobeItemLinks, wardrobeItems]);
  const manualInventoryOptions = useMemo(() => {
    const packedIds = new Set(wardrobeItems.map((item) => item.wardrobe_item_id));
    const normalizedQuery = normalizeText(manualQuery);

    return inventoryItems.filter((item) => {
      if (packedIds.has(item.item_id)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [item.item_id, item.item_name, item.category, item.colour]
        .filter(Boolean)
        .some((field) => normalizeText(field).includes(normalizedQuery));
    });
  }, [inventoryItems, manualQuery, wardrobeItems]);
  const essentialsByCategory = useMemo(() => {
    return tripEssentialItems.reduce<Record<string, TripEssentialItem[]>>((accumulator, item) => {
      const key = item.category || "Custom";
      accumulator[key] = accumulator[key] ? [...accumulator[key], item] : [item];
      return accumulator;
    }, {});
  }, [tripEssentialItems]);
  const summaryStats = useMemo(() => {
    const wardrobeTotal = wardrobeItems.length;
    const wardrobePacked = wardrobeItems.filter((item) => item.packing_status === "packed").length;
    const essentialsTotal = tripEssentialItems.length;
    const essentialsPacked = tripEssentialItems.filter((item) => item.packing_status === "packed").length;
    const totalItems = wardrobeTotal + essentialsTotal;
    const totalPacked = wardrobePacked + essentialsPacked;
    const missingCount =
      wardrobeItems.filter((item) => item.packing_status === "missing").length +
      tripEssentialItems.filter((item) => item.packing_status === "missing").length;

    return {
      wardrobePacked,
      wardrobeTotal,
      wardrobeProgress: wardrobeTotal ? Math.round((wardrobePacked / wardrobeTotal) * 100) : 0,
      essentialsPacked,
      essentialsTotal,
      essentialsProgress: essentialsTotal ? Math.round((essentialsPacked / essentialsTotal) * 100) : 0,
      overallProgress: totalItems ? Math.round((totalPacked / totalItems) * 100) : 0,
      missingCount,
    };
  }, [tripEssentialItems, wardrobeItems]);

  async function refreshTripPacking(nextLinks = selectedTripLinks) {
    if (!session || !selectedTripId) {
      return;
    }

    setIsSyncing(true);
    setErrorMessage("");

    try {
      const derivedMap = new Map<string, string[]>();

      nextLinks.forEach((tripLink) => {
        const outfit = outfits.find((entry) => entry.id === tripLink.outfit_id);

        outfit?.item_ids.forEach((itemId) => {
          const normalizedItemId = itemId.trim().toUpperCase();

          if (!normalizedItemId) {
            return;
          }

          const existing = derivedMap.get(normalizedItemId) ?? [];
          derivedMap.set(normalizedItemId, [...existing, tripLink.id]);
        });
      });

      const currentWardrobeItems = await getTripWardrobeItems(supabase, selectedTripId);
      const currentLinks = await getTripWardrobeItemOutfitLinks(supabase, selectedTripId);
      const currentByItemId = new Map(currentWardrobeItems.map((item) => [item.wardrobe_item_id, item]));

      const upsertRows = [...derivedMap.keys()].map((itemId, index) => {
        const existing = currentByItemId.get(itemId);

        return {
          trip_id: selectedTripId,
          user_id: session.user.id,
          wardrobe_item_id: itemId,
          source: existing?.source ?? "outfit",
          packing_status: existing?.packing_status ?? "pending",
          notes: existing?.notes ?? null,
          sort_order: index,
        } as const;
      });

      if (upsertRows.length > 0) {
        await upsertTripWardrobeItems(supabase, upsertRows);
      }

      const removableGeneratedIds = currentWardrobeItems
        .filter((item) => item.source === "outfit" && !derivedMap.has(item.wardrobe_item_id))
        .map((item) => item.id);

      if (removableGeneratedIds.length > 0) {
        await deleteTripWardrobeItems(supabase, removableGeneratedIds);
      }

      const refreshedWardrobeItems = await getTripWardrobeItems(supabase, selectedTripId);
      const refreshedByItemId = new Map(refreshedWardrobeItems.map((item) => [item.wardrobe_item_id, item]));
      const desiredPairs = new Set<string>();
      const desiredLinkRows: Array<{ trip_wardrobe_item_id: string; trip_outfit_id: string }> = [];

      derivedMap.forEach((tripOutfitIds, itemId) => {
        const wardrobeItem = refreshedByItemId.get(itemId);

        if (!wardrobeItem) {
          return;
        }

        tripOutfitIds.forEach((tripOutfitId) => {
          const key = `${wardrobeItem.id}:${tripOutfitId}`;
          desiredPairs.add(key);
          desiredLinkRows.push({
            trip_wardrobe_item_id: wardrobeItem.id,
            trip_outfit_id: tripOutfitId,
          });
        });
      });

      const obsoleteLinkIds = currentLinks
        .filter((link) => !desiredPairs.has(`${link.trip_wardrobe_item_id}:${link.trip_outfit_id}`))
        .map((link) => link.id);

      if (obsoleteLinkIds.length > 0) {
        await deleteTripWardrobeItemOutfitLinks(supabase, obsoleteLinkIds);
      }

      if (desiredLinkRows.length > 0) {
        await upsertTripWardrobeItemOutfitLinks(supabase, desiredLinkRows);
      }

      const [nextWardrobeItems, nextWardrobeItemLinks] = await Promise.all([
        getTripWardrobeItems(supabase, selectedTripId),
        getTripWardrobeItemOutfitLinks(supabase, selectedTripId),
      ]);

      setWardrobeItems(nextWardrobeItems);
      setWardrobeItemLinks(nextWardrobeItemLinks);
      setNotice("Wardrobe packing refreshed from selected lookbooks.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to refresh wardrobe packing.");
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleTripChange(nextTripId: string) {
    setSelectedTripId(nextTripId);
    router.replace(nextTripId ? `/travel/packing?trip=${nextTripId}` : "/travel/packing");
  }

  async function handleAddLookbook(outfitId: string) {
    if (!session || !selectedTripId) {
      return;
    }

    const nextLink = await addTripOutfitLink(
      supabase,
      session.user.id,
      selectedTripId,
      outfitId,
      selectedTripLinks.length,
    );
    const nextLinks = [...tripLinks, nextLink];
    setTripLinks(nextLinks);
    await refreshTripPacking(nextLinks.filter((link) => link.trip_id === selectedTripId));
  }

  async function handleRemoveLookbook(link: TripOutfitLink) {
    await deleteTripOutfitLink(supabase, link.id);
    const nextLinks = tripLinks.filter((entry) => entry.id !== link.id);
    setTripLinks(nextLinks);
    await refreshTripPacking(nextLinks.filter((entry) => entry.trip_id === selectedTripId));
  }

  async function handleAddManualItem(item: InventoryItem) {
    if (!session || !selectedTripId) {
      return;
    }

    await upsertTripWardrobeItems(supabase, [
      {
        trip_id: selectedTripId,
        user_id: session.user.id,
        wardrobe_item_id: item.item_id,
        source: "manual",
        packing_status: "pending",
        notes: null,
        sort_order: wardrobeItems.length,
      },
    ]);

    const nextItems = await getTripWardrobeItems(supabase, selectedTripId);
    setWardrobeItems(nextItems);
    setNotice(`${item.item_name || item.item_id} added to packed wardrobe.`);
  }

  async function handleRemoveWardrobeItem(item: TripWardrobeItem) {
    await deleteTripWardrobeItems(supabase, [item.id]);
    const [nextItems, nextLinks] = await Promise.all([
      getTripWardrobeItems(supabase, selectedTripId),
      getTripWardrobeItemOutfitLinks(supabase, selectedTripId),
    ]);
    setWardrobeItems(nextItems);
    setWardrobeItemLinks(nextLinks);
    setNotice(`${item.wardrobe_item_id} removed from packed wardrobe.`);
  }

  async function handleUpdateWardrobeStatus(
    item: TripWardrobeItem,
    nextStatus: TripWardrobeItem["packing_status"],
  ) {
    if (!session) {
      return;
    }

    await upsertTripWardrobeItems(supabase, [
      {
        trip_id: item.trip_id,
        user_id: session.user.id,
        wardrobe_item_id: item.wardrobe_item_id,
        source: item.source,
        packing_status: nextStatus,
        notes: item.notes,
        sort_order: item.sort_order,
      },
    ]);

    const nextItems = await getTripWardrobeItems(supabase, selectedTripId);
    setWardrobeItems(nextItems);
  }

  async function handleUpdateEssentialStatus(
    item: TripEssentialItem,
    nextStatus: TripEssentialItem["packing_status"],
  ) {
    const updated = await updateTripEssentialItem(supabase, item.id, {
      packing_status: nextStatus,
    });
    setTripEssentialItems((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
  }

  if (isSessionLoading) {
    return <BrandedLoadingScreen title="Preparing your packing wardrobe" />;
  }

  if (!session) {
    return <LoginForm onSubmit={handleLogin} />;
  }

  return (
    <main className="page-shell">
      <CollectionNav />
      <InternalBackButton href="/travel" label="Back to trips" />

      <header className="page-header page-header-stack">
        <div>
          <h1 className="page-title">Travel</h1>
        </div>
        <TravelShellNav />
      </header>

      {errorMessage ? (
        <section className="dashboard">
          <EmptyState title="Could not load packing" description={errorMessage} />
        </section>
      ) : isLoading ? (
        <BrandedLoadingScreen title="Preparing your packing wardrobe" />
      ) : trips.length === 0 ? (
        <section className="dashboard">
          <EmptyState
            title="No trips yet"
            description="Create a trip first, then build its lookbooks and wardrobe packing here."
          />
        </section>
      ) : (
        <section className="dashboard dashboard-tight">
          <div className="results-bar inventory-overview">
            <div className="results-copy">
              <p className="results-heading">Wardrobe packing</p>
              <p>
                {selectedTrip
                  ? `${selectedTrip.title} - ${formatTripDateRange(selectedTrip.start_date, selectedTrip.end_date)}`
                  : "Choose a trip to begin packing."}
              </p>
            </div>

            <div className="packing-toolbar-actions">
              <label className="field packing-trip-select">
                <span>Trip</span>
                <select
                  className="filter-select"
                  value={selectedTripId}
                  onChange={(event) => void handleTripChange(event.target.value)}
                >
                  {trips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.title}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                className="ghost-button"
                onClick={() => void refreshTripPacking()}
                disabled={!selectedTripId || isSyncing}
              >
                {isSyncing ? "Refreshing..." : "Refresh wardrobe"}
              </button>
            </div>
          </div>

          {notice ? <p className="inline-notice">{notice}</p> : null}

          <div className="travel-summary-grid">
            <article className="detail-card travel-summary-card">
              <p className="sku-label">Wardrobe packed</p>
              <strong>{summaryStats.wardrobeProgress}%</strong>
              <span>
                {summaryStats.wardrobePacked} of {summaryStats.wardrobeTotal} packed
              </span>
            </article>
            <article className="detail-card travel-summary-card">
              <p className="sku-label">Essentials packed</p>
              <strong>{summaryStats.essentialsProgress}%</strong>
              <span>
                {summaryStats.essentialsPacked} of {summaryStats.essentialsTotal} packed
              </span>
            </article>
            <article className="detail-card travel-summary-card">
              <p className="sku-label">Overall progress</p>
              <strong>{summaryStats.overallProgress}%</strong>
              <span>Across wardrobe and essentials</span>
            </article>
            <article className="detail-card travel-summary-card">
              <p className="sku-label">Missing items</p>
              <strong>{summaryStats.missingCount}</strong>
              <span>Marked missing so far</span>
            </article>
          </div>

          <div className="travel-shell-grid packing-shell-grid">
            <article className="detail-card">
              <div className="results-bar">
                <div className="results-copy">
                  <p className="results-heading">Selected lookbooks</p>
                  <p>{selectedOutfits.length} linked lookbook{selectedOutfits.length === 1 ? "" : "s"}</p>
                </div>
              </div>

              <div className="packing-chip-list">
                {selectedTripLinks.length === 0 ? (
                  <p className="detail-description">
                    Start by adding the looks you want to pack for this trip.
                  </p>
                ) : (
                  selectedTripLinks.map((link) => {
                    const outfit = outfits.find((entry) => entry.id === link.outfit_id);

                    if (!outfit) {
                      return null;
                    }

                    return (
                      <div key={link.id} className="packing-look-chip">
                        <div>
                          <p className="sku-label">Lookbook</p>
                          <strong>{outfit.title}</strong>
                        </div>
                        <button
                          type="button"
                          className="ghost-button studio-mini-button"
                          onClick={() => void handleRemoveLookbook(link)}
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="search-panel search-panel-compact">
                <label className="search-label" htmlFor="packing-lookbook-search">
                  Add lookbooks to this trip
                </label>
                <input
                  id="packing-lookbook-search"
                  className="search-input"
                  type="search"
                  value={lookbookQuery}
                  placeholder="Search lookbooks"
                  onChange={(event) => setLookbookQuery(event.target.value)}
                />
              </div>

              <div className="packing-selection-list">
                {availableOutfits.slice(0, 8).map((outfit) => (
                  <button
                    key={outfit.id}
                    type="button"
                    className="packing-selection-row"
                    onClick={() => void handleAddLookbook(outfit.id)}
                  >
                    <span>
                      <strong>{outfit.title}</strong>
                      <small>{outfit.trip || outfit.occasion || "Lookbook"}</small>
                    </span>
                    <span>Add</span>
                  </button>
                ))}
              </div>
            </article>

            <article className="detail-card">
              <div className="results-bar">
                <div className="results-copy">
                  <p className="results-heading">Manual add</p>
                  <p>Add wardrobe pieces beyond the selected lookbooks.</p>
                </div>
              </div>

              <div className="search-panel search-panel-compact">
                <label className="search-label" htmlFor="packing-manual-search">
                  Search wardrobe items
                </label>
                <input
                  id="packing-manual-search"
                  className="search-input"
                  type="search"
                  value={manualQuery}
                  placeholder="Search by item name, ID, category, or colour"
                  onChange={(event) => setManualQuery(event.target.value)}
                />
              </div>

              <div className="packing-selection-list">
                {manualInventoryOptions.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="packing-selection-row"
                    onClick={() => void handleAddManualItem(item)}
                  >
                    <span>
                      <strong>{item.item_name || item.item_id}</strong>
                      <small>{item.item_id} • {item.category || "Wardrobe piece"}</small>
                    </span>
                    <span>Add</span>
                  </button>
                ))}
              </div>
            </article>
          </div>

          {wardrobeEntries.length === 0 ? (
            <EmptyState
              title="No wardrobe items packed yet"
              description="Link lookbooks or manually add pieces to generate the trip wardrobe."
            />
          ) : (
            <div className="inventory-grid">
              {wardrobeEntries.map(({ row, inventoryItem, usedInOutfits }) => {
                const imageUrl = inventoryItem ? getDisplayImage(inventoryItem.image) : null;

                return (
                  <article key={row.id} className="inventory-card">
                    <div className="card-image-wrap">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={inventoryItem?.item_name || row.wardrobe_item_id}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="card-image"
                        />
                      ) : (
                        <div className="card-image-fallback">No image available</div>
                      )}
                    </div>

                    <div className="inventory-card-body">
                      <div className="inventory-card-copy">
                        <p className="sku-label">{row.wardrobe_item_id}</p>
                        <h2>{inventoryItem?.item_name || row.wardrobe_item_id}</h2>
                        <div className="inventory-card-meta">
                          <span>{inventoryItem?.category || "Wardrobe item"}</span>
                          <span>{row.source === "manual" ? "Manual add" : "From lookbooks"}</span>
                        </div>
                      </div>

                      <div className="packing-used-list">
                        {usedInOutfits.length === 0 ? (
                          <span className="trip-meta-pill trip-meta-pill-muted">Manual item</span>
                        ) : (
                          usedInOutfits.map((outfit) => (
                            <span key={outfit.id} className="trip-meta-pill">
                              {outfit.title}
                            </span>
                          ))
                        )}
                      </div>

                      <div className="packing-status-row">
                        {(["pending", "packed", "not_required", "missing"] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            className={`status-toggle ${row.packing_status === status ? "is-active" : ""}`}
                            onClick={() => void handleUpdateWardrobeStatus(row, status)}
                          >
                            {status.replace("_", " ")}
                          </button>
                        ))}
                      </div>

                      <div className="inventory-card-actions">
                        <button
                          type="button"
                          className="ghost-button outfit-inline-action danger-button"
                          onClick={() => void handleRemoveWardrobeItem(row)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="travel-shell-grid packing-shell-grid">
            <article className="detail-card essentials-group-card">
              <div className="results-bar">
                <div className="results-copy">
                  <p className="results-heading">Trip essentials</p>
                  <p>
                    Seeded from your reusable library for this trip, then tracked independently.
                  </p>
                </div>
              </div>

              {tripEssentialItems.length === 0 ? (
                <p className="detail-description">
                  Add essentials to the library first, then they will appear here for each trip.
                </p>
              ) : (
                <div className="essentials-groups">
                  {Object.entries(essentialsByCategory)
                    .sort(([left], [right]) => left.localeCompare(right))
                    .map(([category, items]) => {
                      const packedCount = items.filter((item) => item.packing_status === "packed").length;
                      const progress = items.length ? Math.round((packedCount / items.length) * 100) : 0;

                      return (
                        <section key={category} className="essential-category-block">
                          <div className="results-bar">
                            <div className="results-copy">
                              <p className="results-heading">{category}</p>
                              <p>
                                {packedCount} of {items.length} packed
                              </p>
                            </div>
                            <span className="trip-meta-pill">{progress}%</span>
                          </div>

                          <div className="essentials-list">
                            {items.map((item) => (
                              <article key={item.id} className="essential-row">
                                <div className="essential-row-copy">
                                  <div className="essential-row-head">
                                    <div>
                                      <p className="sku-label">Essential</p>
                                      <h2>{item.title}</h2>
                                    </div>
                                    <span className="trip-meta-pill">
                                      {formatEssentialInclusionType(item.inclusion_type)}
                                    </span>
                                  </div>
                                  {item.notes ? <p className="trip-card-notes">{item.notes}</p> : null}
                                </div>

                                <div className="packing-status-row">
                                  {(["pending", "packed", "not_required", "missing"] as const).map((status) => (
                                    <button
                                      key={status}
                                      type="button"
                                      className={`status-toggle ${item.packing_status === status ? "is-active" : ""}`}
                                      onClick={() => void handleUpdateEssentialStatus(item, status)}
                                    >
                                      {status.replace("_", " ")}
                                    </button>
                                  ))}
                                </div>
                              </article>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                </div>
              )}
            </article>
          </div>

          <div className="travel-shell-grid">
            <TravelCataloguePanel />
          </div>
        </section>
      )}
    </main>
  );
}
