"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { CollectionNav } from "@/components/navigation/collection-nav";
import { InternalBackButton } from "@/components/navigation/internal-back-button";
import { TravelCataloguePanel } from "@/components/travel/travel-catalogue-panel";
import { TravelShellNav } from "@/components/travel/travel-shell-nav";
import { BrandedLoadingScreen } from "@/components/ui/branded-loading-screen";
import { DetailGrid } from "@/components/ui/detail-grid";
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
  getTripById,
  getTripEssentialItems,
  getTripOutfitLinks,
  getTripWardrobeItemOutfitLinks,
  getTripWardrobeItems,
  reorderTripEssentialItems,
  reorderTripOutfitLinks,
  updateTripEssentialItem,
  upsertTripWardrobeItemOutfitLinks,
  upsertTripWardrobeItems,
} from "@/lib/data/travel";
import { getDisplayImage, normalizeText } from "@/lib/inventory";
import {
  ESSENTIAL_CATEGORY_OPTIONS,
  formatEssentialInclusionType,
  formatTripDateRange,
  formatTripStatus,
} from "@/lib/travel";
import { getOutfitDisplayImage } from "@/lib/outfits";
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

type TripStudioTab = "overview" | "looks" | "packing" | "essentials" | "catalogue" | "summary";

const TRIP_STUDIO_TABS: Array<{ id: TripStudioTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "looks", label: "Looks" },
  { id: "packing", label: "Wardrobe Packing" },
  { id: "essentials", label: "Essentials" },
  { id: "catalogue", label: "Catalogue" },
  { id: "summary", label: "Packed Summary" },
];

type EssentialDraft = {
  title: string;
  notes: string;
};

const emptyEssentialDraft: EssentialDraft = {
  title: "",
  notes: "",
};

export function TripDetailShell({ tripId }: { tripId: string }) {
  const { supabase, session, isSessionLoading, handleLogin } = useWardrobeSession();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [tripLinks, setTripLinks] = useState<TripOutfitLink[]>([]);
  const [wardrobeItems, setWardrobeItems] = useState<TripWardrobeItem[]>([]);
  const [wardrobeItemLinks, setWardrobeItemLinks] = useState<TripWardrobeItemOutfitLink[]>([]);
  const [essentialLibraryItems, setEssentialLibraryItems] = useState<EssentialLibraryItem[]>([]);
  const [tripEssentialItems, setTripEssentialItems] = useState<TripEssentialItem[]>([]);
  const [activeTab, setActiveTab] = useState<TripStudioTab>("overview");
  const [lookQuery, setLookQuery] = useState("");
  const [packingQuery, setPackingQuery] = useState("");
  const [packingCategory, setPackingCategory] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [newEssentialDraft, setNewEssentialDraft] = useState<EssentialDraft>(emptyEssentialDraft);
  const [editingEssentialId, setEditingEssentialId] = useState<string | null>(null);
  const [editingEssentialDraft, setEditingEssentialDraft] = useState<EssentialDraft>(emptyEssentialDraft);
  const [draggedTripLinkId, setDraggedTripLinkId] = useState("");
  const [draggedEssentialId, setDraggedEssentialId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadTripStudio() {
      if (!session) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const [
          nextTrip,
          nextOutfits,
          nextInventory,
          nextTripLinks,
          nextWardrobeItems,
          nextWardrobeItemLinks,
          nextLibraryItems,
          currentTripEssentials,
        ] = await Promise.all([
          getTripById(supabase, tripId),
          getOutfits(supabase),
          getInventoryItems(supabase),
          getTripOutfitLinks(supabase, tripId),
          getTripWardrobeItems(supabase, tripId),
          getTripWardrobeItemOutfitLinks(supabase, tripId),
          getEssentialLibraryItems(supabase),
          getTripEssentialItems(supabase, tripId),
        ]);

        if (!nextTrip) {
          if (isActive) {
            setTrip(null);
          }
          return;
        }

        const activeLibraryItems = nextLibraryItems.filter((item) => !item.is_archived);
        let resolvedTripEssentials = currentTripEssentials;

        if (currentTripEssentials.length === 0 && activeLibraryItems.length > 0) {
          resolvedTripEssentials = await createTripEssentialItems(
            supabase,
            activeLibraryItems.map((item, index) => ({
              trip_id: tripId,
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

        if (!isActive) {
          return;
        }

        setTrip(nextTrip);
        setOutfits(nextOutfits);
        setInventoryItems(nextInventory);
        setTripLinks(nextTripLinks);
        setWardrobeItems(nextWardrobeItems);
        setWardrobeItemLinks(nextWardrobeItemLinks);
        setEssentialLibraryItems(activeLibraryItems);
        setTripEssentialItems(resolvedTripEssentials);
        setCollapsedCategories((current) =>
          Object.keys(current).length
            ? current
            : Object.fromEntries(
                [...new Set(resolvedTripEssentials.map((item) => item.category || "Custom"))].map((category) => [
                  category,
                  false,
                ]),
              ),
        );
      } catch (error) {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load this trip.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadTripStudio();

    return () => {
      isActive = false;
    };
  }, [session, supabase, tripId]);

  const selectedOutfitIds = useMemo(
    () => new Set(tripLinks.map((link) => link.outfit_id)),
    [tripLinks],
  );
  const selectedOutfitEntries = useMemo(
    () =>
      tripLinks
        .map((link) => ({
          link,
          outfit: outfits.find((outfit) => outfit.id === link.outfit_id) ?? null,
        }))
        .filter((entry): entry is { link: TripOutfitLink; outfit: Outfit } => Boolean(entry.outfit)),
    [outfits, tripLinks],
  );
  const filteredOutfits = useMemo(() => {
    const normalizedQuery = normalizeText(lookQuery);

    return outfits.filter((outfit) => {
      if (!normalizedQuery) {
        return true;
      }

      return [outfit.title, outfit.occasion, outfit.trip, outfit.tags.join(" "), outfit.item_ids.join(" ")]
        .filter(Boolean)
        .some((field) => normalizeText(field).includes(normalizedQuery));
    });
  }, [lookQuery, outfits]);
  const wardrobeEntries = useMemo(() => {
    const inventoryMap = new Map(inventoryItems.map((item) => [item.item_id, item]));
    const outfitMap = new Map(outfits.map((outfit) => [outfit.id, outfit]));

    return wardrobeItems
      .map((entry) => {
        const inventoryItem = inventoryMap.get(entry.wardrobe_item_id) ?? null;
        const usedInOutfits = wardrobeItemLinks
          .filter((link) => link.trip_wardrobe_item_id === entry.id)
          .map((link) => {
            const tripLink = tripLinks.find((tripEntry) => tripEntry.id === link.trip_outfit_id);
            return tripLink ? outfitMap.get(tripLink.outfit_id) ?? null : null;
          })
          .filter((outfit): outfit is Outfit => Boolean(outfit));

        return {
          row: entry,
          inventoryItem,
          usedInOutfits,
        };
      })
      .sort((left, right) => left.row.sort_order - right.row.sort_order);
  }, [inventoryItems, outfits, tripLinks, wardrobeItemLinks, wardrobeItems]);
  const packingCategoryOptions = useMemo(
    () =>
      [...new Set(wardrobeEntries.map((entry) => entry.inventoryItem?.category?.trim()).filter(Boolean))] as string[],
    [wardrobeEntries],
  );
  const filteredWardrobeEntries = useMemo(() => {
    const normalizedQuery = normalizeText(packingQuery);

    return wardrobeEntries.filter((entry) => {
      const matchesQuery =
        !normalizedQuery ||
        [entry.row.wardrobe_item_id, entry.inventoryItem?.item_name, entry.inventoryItem?.category, entry.inventoryItem?.colour]
          .filter(Boolean)
          .some((field) => normalizeText(field).includes(normalizedQuery));
      const matchesCategory =
        !packingCategory ||
        normalizeText(entry.inventoryItem?.category) === normalizeText(packingCategory);

      return matchesQuery && matchesCategory;
    });
  }, [packingCategory, packingQuery, wardrobeEntries]);
  const manualInventoryOptions = useMemo(() => {
    const packedIds = new Set(wardrobeItems.map((item) => item.wardrobe_item_id));

    return inventoryItems.filter((item) => {
      if (packedIds.has(item.item_id)) {
        return false;
      }

      if (!packingQuery.trim()) {
        return true;
      }

      return [item.item_id, item.item_name, item.category, item.colour]
        .filter(Boolean)
        .some((field) => normalizeText(field).includes(normalizeText(packingQuery)));
    });
  }, [inventoryItems, packingQuery, wardrobeItems]);
  const essentialsByCategory = useMemo(() => {
    return tripEssentialItems.reduce<Record<string, TripEssentialItem[]>>((accumulator, item) => {
      const key = item.category || "Custom";
      accumulator[key] = accumulator[key] ? [...accumulator[key], item] : [item];
      return accumulator;
    }, {});
  }, [tripEssentialItems]);
  const wardrobeCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();

    wardrobeEntries.forEach((entry) => {
      const key = entry.inventoryItem?.category?.trim() || "Uncategorised";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });

    return [...counts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
  }, [wardrobeEntries]);
  const summaryStats = useMemo(() => {
    const wardrobeTotal = wardrobeItems.length;
    const wardrobePacked = wardrobeItems.filter((item) => item.packing_status === "packed").length;
    const essentialsTotal = tripEssentialItems.length;
    const essentialsPacked = tripEssentialItems.filter((item) => item.packing_status === "packed").length;
    const totalItems = wardrobeTotal + essentialsTotal;
    const totalPacked = wardrobePacked + essentialsPacked;

    return {
      looksTotal: selectedOutfitEntries.length,
      wardrobeTotal,
      wardrobePacked,
      wardrobeProgress: wardrobeTotal ? Math.round((wardrobePacked / wardrobeTotal) * 100) : 0,
      essentialsTotal,
      essentialsPacked,
      essentialsProgress: essentialsTotal ? Math.round((essentialsPacked / essentialsTotal) * 100) : 0,
      overallProgress: totalItems ? Math.round((totalPacked / totalItems) * 100) : 0,
      missingCount:
        wardrobeItems.filter((item) => item.packing_status === "missing").length +
        tripEssentialItems.filter((item) => item.packing_status === "missing").length,
    };
  }, [selectedOutfitEntries.length, tripEssentialItems, wardrobeItems]);

  async function refreshTripPacking(nextLinks = tripLinks) {
    if (!session || !trip) {
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

      const currentWardrobeItems = await getTripWardrobeItems(supabase, trip.id);
      const currentLinks = await getTripWardrobeItemOutfitLinks(supabase, trip.id);
      const currentByItemId = new Map(currentWardrobeItems.map((item) => [item.wardrobe_item_id, item]));

      const upsertRows = [...derivedMap.keys()].map((itemId, index) => {
        const existing = currentByItemId.get(itemId);
        return {
          trip_id: trip.id,
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

      const refreshedWardrobeItems = await getTripWardrobeItems(supabase, trip.id);
      const refreshedByItemId = new Map(refreshedWardrobeItems.map((item) => [item.wardrobe_item_id, item]));
      const desiredPairs = new Set<string>();
      const desiredLinkRows: Array<{ trip_wardrobe_item_id: string; trip_outfit_id: string }> = [];

      derivedMap.forEach((tripOutfitIds, itemId) => {
        const wardrobeItem = refreshedByItemId.get(itemId);

        if (!wardrobeItem) {
          return;
        }

        tripOutfitIds.forEach((tripOutfitId) => {
          desiredPairs.add(`${wardrobeItem.id}:${tripOutfitId}`);
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
        getTripWardrobeItems(supabase, trip.id),
        getTripWardrobeItemOutfitLinks(supabase, trip.id),
      ]);

      setWardrobeItems(nextWardrobeItems);
      setWardrobeItemLinks(nextWardrobeItemLinks);
      setNotice("Wardrobe packing updated from selected looks.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to refresh wardrobe packing.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleToggleOutfit(outfit: Outfit) {
    if (!session || !trip) {
      return;
    }

    const existingLink = tripLinks.find((link) => link.outfit_id === outfit.id);

    if (existingLink) {
      await deleteTripOutfitLink(supabase, existingLink.id);
      const nextLinks = tripLinks.filter((link) => link.id !== existingLink.id);
      setTripLinks(nextLinks);
      await refreshTripPacking(nextLinks);
      setNotice(`${outfit.title} removed from this trip.`);
      return;
    }

    const nextLink = await addTripOutfitLink(
      supabase,
      session.user.id,
      trip.id,
      outfit.id,
      tripLinks.length,
    );
    const nextLinks = [...tripLinks, nextLink];
    setTripLinks(nextLinks);
    await refreshTripPacking(nextLinks);
    setNotice(`${outfit.title} added to this trip.`);
  }

  async function handleReorderSelectedOutfits(targetLinkId: string) {
    if (!draggedTripLinkId || draggedTripLinkId === targetLinkId) {
      setDraggedTripLinkId("");
      return;
    }

    const currentIndex = tripLinks.findIndex((link) => link.id === draggedTripLinkId);
    const targetIndex = tripLinks.findIndex((link) => link.id === targetLinkId);

    if (currentIndex === -1 || targetIndex === -1) {
      setDraggedTripLinkId("");
      return;
    }

    const nextSelected = [...tripLinks];
    const [moved] = nextSelected.splice(currentIndex, 1);
    nextSelected.splice(targetIndex, 0, moved);
    const resequenced = nextSelected.map((link, index) => ({ ...link, sort_order: index }));
    setTripLinks(resequenced);
    setDraggedTripLinkId("");

    try {
      const persisted = await reorderTripOutfitLinks(supabase, resequenced);
      setTripLinks(persisted.sort((left, right) => left.sort_order - right.sort_order));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to reorder looks.");
    }
  }

  async function handleAddManualItem(item: InventoryItem) {
    if (!session || !trip) {
      return;
    }

    await upsertTripWardrobeItems(supabase, [
      {
        trip_id: trip.id,
        user_id: session.user.id,
        wardrobe_item_id: item.item_id,
        source: "manual",
        packing_status: "pending",
        notes: null,
        sort_order: wardrobeItems.length,
      },
    ]);

    setWardrobeItems(await getTripWardrobeItems(supabase, trip.id));
    setNotice(`${item.item_name || item.item_id} added to packed wardrobe.`);
  }

  async function handleRemoveWardrobeItem(item: TripWardrobeItem) {
    if (!trip) {
      return;
    }

    await deleteTripWardrobeItems(supabase, [item.id]);
    const [nextItems, nextLinks] = await Promise.all([
      getTripWardrobeItems(supabase, trip.id),
      getTripWardrobeItemOutfitLinks(supabase, trip.id),
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

    setWardrobeItems(await getTripWardrobeItems(supabase, item.trip_id));
  }

  async function handleUpdateEssentialStatus(
    item: TripEssentialItem,
    nextStatus: TripEssentialItem["packing_status"],
  ) {
    const updated = await updateTripEssentialItem(supabase, item.id, {
      packing_status: nextStatus,
    });
    setTripEssentialItems((current) =>
      current.map((entry) => (entry.id === item.id ? updated : entry)),
    );
  }

  async function handleSaveEditedEssential(item: TripEssentialItem) {
    const title = editingEssentialDraft.title.trim();

    if (!title) {
      return;
    }

    const updated = await updateTripEssentialItem(supabase, item.id, {
      title,
      notes: editingEssentialDraft.notes.trim() || null,
    });

    setTripEssentialItems((current) =>
      current.map((entry) => (entry.id === item.id ? updated : entry)),
    );
    setEditingEssentialId(null);
    setEditingEssentialDraft(emptyEssentialDraft);
  }

  async function handleDuplicateEssential(item: TripEssentialItem) {
    if (!session || !trip) {
      return;
    }

    const [duplicated] = await createTripEssentialItems(supabase, [
      {
        trip_id: trip.id,
        user_id: session.user.id,
        source_library_item_id: item.source_library_item_id,
        title: `${item.title} Copy`,
        category: item.category,
        inclusion_type: item.inclusion_type,
        packing_status: item.packing_status,
        notes: item.notes,
        sort_order: tripEssentialItems.length,
      },
    ]);

    setTripEssentialItems((current) => [...current, duplicated]);
    setNotice(`${item.title} duplicated.`);
  }

  async function handleAddInlineEssential(category: string) {
    if (!session || !trip || !newEssentialDraft.title.trim()) {
      return;
    }

    const [created] = await createTripEssentialItems(supabase, [
      {
        trip_id: trip.id,
        user_id: session.user.id,
        title: newEssentialDraft.title.trim(),
        category,
        inclusion_type: "trip_specific",
        packing_status: "pending",
        notes: newEssentialDraft.notes.trim() || null,
        sort_order: tripEssentialItems.length,
      },
    ]);

    setTripEssentialItems((current) => [...current, created]);
    setAddingCategory(null);
    setNewEssentialDraft(emptyEssentialDraft);
    setNotice(`${created.title} added to ${category}.`);
  }

  async function handleReorderEssentials(targetId: string) {
    if (!draggedEssentialId || draggedEssentialId === targetId) {
      setDraggedEssentialId("");
      return;
    }

    const currentIndex = tripEssentialItems.findIndex((item) => item.id === draggedEssentialId);
    const targetIndex = tripEssentialItems.findIndex((item) => item.id === targetId);

    if (currentIndex === -1 || targetIndex === -1) {
      setDraggedEssentialId("");
      return;
    }

    const nextItems = [...tripEssentialItems];
    const [moved] = nextItems.splice(currentIndex, 1);
    nextItems.splice(targetIndex, 0, moved);
    const resequenced = nextItems.map((item, index) => ({ ...item, sort_order: index }));
    setTripEssentialItems(resequenced);
    setDraggedEssentialId("");

    try {
      const persisted = await reorderTripEssentialItems(supabase, resequenced);
      setTripEssentialItems(persisted.sort((left, right) => left.sort_order - right.sort_order));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to reorder essentials.",
      );
    }
  }

  const detailRows = useMemo(() => {
    if (!trip) {
      return [];
    }

    return [
      ["Status", formatTripStatus(trip.status)],
      ["Dates", formatTripDateRange(trip.start_date, trip.end_date)],
      ["Destination", trip.destination ?? "Not yet added"],
      ["Baggage", trip.baggage_limit ?? "Not yet added"],
      ["Looks", `${selectedOutfitEntries.length}`],
      ["Wardrobe pieces", `${wardrobeItems.length}`],
      ["Essentials", `${tripEssentialItems.length}`],
    ] as const;
  }, [selectedOutfitEntries.length, trip, tripEssentialItems.length, wardrobeItems.length]);

  if (isSessionLoading) {
    return <BrandedLoadingScreen title="Preparing your trip studio" />;
  }

  if (!session) {
    return <LoginForm onSubmit={handleLogin} />;
  }

  if (isLoading) {
    return <BrandedLoadingScreen title="Preparing your trip studio" />;
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
          <EmptyState title="Could not load trip" description={errorMessage} />
        </section>
      ) : !trip ? (
        <section className="dashboard">
          <EmptyState
            title="Trip not found"
            description="This trip may have been removed, or it may belong to a different signed-in wardrobe account."
          />
        </section>
      ) : (
        <section className="dashboard dashboard-tight">
          <div className="travel-studio-hero">
            <div className="travel-studio-copy">
              <p className="eyebrow">Trip Detail</p>
              <h2>{trip.title}</h2>
              <p>{trip.destination || "Destination to be decided"}</p>
            </div>

            <div className="travel-studio-hero-meta">
              <span className="trip-meta-pill">{formatTripDateRange(trip.start_date, trip.end_date)}</span>
              <span className={`trip-status-pill status-${trip.status}`}>{formatTripStatus(trip.status)}</span>
              <span className="trip-meta-pill">{summaryStats.overallProgress}% packed</span>
            </div>
          </div>

          <div className="travel-tabbar" role="tablist" aria-label="Trip detail sections">
            {TRIP_STUDIO_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`travel-tab ${activeTab === tab.id ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {notice ? <p className="inline-notice">{notice}</p> : null}

          <section className="travel-tab-panel">
            {activeTab === "overview" ? (
              <div className="travel-shell-grid">
                <article className="detail-card">
                  <p className="eyebrow">Overview</p>
                  <DetailGrid rows={detailRows} />
                  {trip.notes ? <p className="detail-description">{trip.notes}</p> : null}
                </article>

                <article className="detail-card travel-summary-card-panel">
                  <div className="travel-summary-grid travel-summary-grid-compact">
                    <SummaryRing label="Overall" value={summaryStats.overallProgress} />
                    <SummaryRing label="Wardrobe" value={summaryStats.wardrobeProgress} />
                    <SummaryRing label="Essentials" value={summaryStats.essentialsProgress} />
                  </div>
                </article>
              </div>
            ) : null}

            {activeTab === "looks" ? (
              <div className="dashboard dashboard-tight">
                <div className="travel-shell-grid packing-shell-grid">
                  <article className="detail-card">
                    <div className="results-bar">
                      <div className="results-copy">
                        <p className="results-heading">Selected looks</p>
                        <p>Drag to reorder your trip looks.</p>
                      </div>
                    </div>

                    {selectedOutfitEntries.length === 0 ? (
                      <EmptyState
                        compact
                        title="No looks selected yet"
                        description="Choose outfits below to start building the trip wardrobe."
                      />
                    ) : (
                      <div className="travel-lookbook-board">
                        {selectedOutfitEntries.map(({ link, outfit }) => {
                          const imageUrl = getOutfitDisplayImage(outfit);

                          return (
                            <article
                              key={link.id}
                              className="travel-lookbook-card is-selected"
                              draggable
                              onDragStart={() => setDraggedTripLinkId(link.id)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => void handleReorderSelectedOutfits(link.id)}
                            >
                              <div className="travel-lookbook-media">
                                {imageUrl ? (
                                  <Image
                                    src={imageUrl}
                                    alt={outfit.title}
                                    fill
                                    sizes="(max-width: 768px) 50vw, 20vw"
                                    className="travel-lookbook-image"
                                  />
                                ) : (
                                  <div className="card-image-fallback">No image available</div>
                                )}
                              </div>
                              <div className="travel-lookbook-body">
                                <p className="sku-label">Selected look</p>
                                <h3>{outfit.title}</h3>
                                <p className="travel-lookbook-meta">
                                  {outfit.occasion || outfit.trip || "Lookbook"} • {outfit.item_ids.length} items
                                </p>
                                <div className="travel-lookbook-actions">
                                  <Link className="ghost-button studio-mini-button" href={`/outfits/${outfit.id}`}>
                                    Open
                                  </Link>
                                  <button
                                    type="button"
                                    className="ghost-button studio-mini-button"
                                    onClick={() => void handleToggleOutfit(outfit)}
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
                  </article>

                  <article className="detail-card">
                    <div className="search-panel search-panel-compact">
                      <label className="search-label" htmlFor="trip-look-search">
                        Search and select lookbooks
                      </label>
                      <input
                        id="trip-look-search"
                        className="search-input"
                        type="search"
                        value={lookQuery}
                        placeholder="Search by title, occasion, or trip"
                        onChange={(event) => setLookQuery(event.target.value)}
                      />
                    </div>

                    <div className="travel-lookbook-grid">
                      {filteredOutfits.map((outfit) => {
                        const isSelected = selectedOutfitIds.has(outfit.id);
                        const imageUrl = getOutfitDisplayImage(outfit);

                        return (
                          <button
                            key={outfit.id}
                            type="button"
                            className={`travel-lookbook-card ${isSelected ? "is-selected" : ""}`}
                            onClick={() => void handleToggleOutfit(outfit)}
                          >
                            <div className="travel-lookbook-media">
                              {imageUrl ? (
                                <Image
                                  src={imageUrl}
                                  alt={outfit.title}
                                  fill
                                  sizes="(max-width: 768px) 50vw, 20vw"
                                  className="travel-lookbook-image"
                                />
                              ) : (
                                <div className="card-image-fallback">No image available</div>
                              )}
                            </div>
                            <div className="travel-lookbook-body">
                              <p className="sku-label">{isSelected ? "Selected" : "Available"}</p>
                              <h3>{outfit.title}</h3>
                              <p className="travel-lookbook-meta">
                                {outfit.occasion || outfit.trip || "Lookbook"} • {outfit.item_ids.length} items
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </article>
                </div>
              </div>
            ) : null}

            {activeTab === "packing" ? (
              <div className="dashboard dashboard-tight">
                <div className="results-bar inventory-overview">
                  <div className="results-copy">
                    <p className="results-heading">Wardrobe packing</p>
                    <p>Visual packing generated from selected looks, with room for manual additions.</p>
                  </div>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => void refreshTripPacking()}
                    disabled={isSyncing}
                  >
                    {isSyncing ? "Refreshing..." : "Refresh wardrobe"}
                  </button>
                </div>

                <div className="travel-shell-grid packing-shell-grid">
                  <article className="detail-card">
                    <div className="search-panel search-panel-compact">
                      <label className="search-label" htmlFor="trip-packing-search">
                        Search packed wardrobe
                      </label>
                      <input
                        id="trip-packing-search"
                        className="search-input"
                        type="search"
                        value={packingQuery}
                        placeholder="Search by item, ID, category, or colour"
                        onChange={(event) => setPackingQuery(event.target.value)}
                      />
                    </div>
                  </article>

                  <article className="detail-card">
                    <label className="field">
                      <span>Filter by category</span>
                      <select
                        className="filter-select"
                        value={packingCategory}
                        onChange={(event) => setPackingCategory(event.target.value)}
                      >
                        <option value="">All categories</option>
                        {packingCategoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                </div>

                {filteredWardrobeEntries.length === 0 ? (
                  <EmptyState
                    compact
                    title="No wardrobe items packed yet"
                    description="Select looks or manually add wardrobe pieces to begin packing."
                  />
                ) : (
                  <div className="inventory-grid">
                    {filteredWardrobeEntries.map(({ row, inventoryItem, usedInOutfits }) => {
                      const imageUrl = inventoryItem ? getDisplayImage(inventoryItem.image) : null;

                      return (
                        <article className="inventory-card travel-packing-card" key={row.id}>
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
                                <span>{row.source === "manual" ? "Manual add" : "From looks"}</span>
                              </div>
                            </div>

                            <div className="travel-used-in">
                              <span className="travel-used-in-label">Used in:</span>
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

                <article className="detail-card">
                  <div className="results-bar">
                    <div className="results-copy">
                      <p className="results-heading">Manual add</p>
                      <p>Add extra wardrobe pieces beyond the selected looks.</p>
                    </div>
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
                          <small>
                            {item.item_id} • {item.category || "Wardrobe piece"}
                          </small>
                        </span>
                        <span>Add</span>
                      </button>
                    ))}
                  </div>
                </article>
              </div>
            ) : null}

            {activeTab === "essentials" ? (
              <div className="dashboard dashboard-tight">
                <div className="results-bar inventory-overview">
                  <div className="results-copy">
                    <p className="results-heading">Trip essentials</p>
                    <p>Collapse categories, add inline, drag to reorder, and mark progress as you pack.</p>
                  </div>
                </div>

                {Object.keys(essentialsByCategory).length === 0 ? (
                  <EmptyState
                    compact
                    title="No essentials for this trip yet"
                    description="Add essentials to the library or create trip-specific items inline."
                  />
                ) : (
                  <div className="essentials-groups">
                    {Object.entries(essentialsByCategory)
                      .sort(([left], [right]) => left.localeCompare(right))
                      .map(([category, items]) => {
                        const isCollapsed = collapsedCategories[category] ?? false;
                        const packedCount = items.filter((item) => item.packing_status === "packed").length;

                        return (
                          <section className="detail-card essentials-group-card" key={category}>
                            <div className="results-bar">
                              <div className="results-copy">
                                <p className="results-heading">{category}</p>
                                <p>
                                  {packedCount} of {items.length} packed
                                </p>
                              </div>
                              <div className="travel-essentials-toolbar">
                                <button
                                  type="button"
                                  className="ghost-button studio-mini-button"
                                  onClick={() =>
                                    setAddingCategory((current) => (current === category ? null : category))
                                  }
                                >
                                  Add item
                                </button>
                                <button
                                  type="button"
                                  className="ghost-button studio-mini-button"
                                  onClick={() =>
                                    setCollapsedCategories((current) => ({
                                      ...current,
                                      [category]: !isCollapsed,
                                    }))
                                  }
                                >
                                  {isCollapsed ? "Expand" : "Collapse"}
                                </button>
                              </div>
                            </div>

                            {addingCategory === category ? (
                              <div className="travel-inline-essential-editor">
                                <input
                                  className="text-input"
                                  value={newEssentialDraft.title}
                                  placeholder={`Add ${category} item`}
                                  onChange={(event) =>
                                    setNewEssentialDraft((current) => ({
                                      ...current,
                                      title: event.target.value,
                                    }))
                                  }
                                />
                                <input
                                  className="text-input"
                                  value={newEssentialDraft.notes}
                                  placeholder="Optional note"
                                  onChange={(event) =>
                                    setNewEssentialDraft((current) => ({
                                      ...current,
                                      notes: event.target.value,
                                    }))
                                  }
                                />
                                <div className="travel-inline-actions">
                                  <button
                                    type="button"
                                    className="primary-button studio-mini-button"
                                    onClick={() => void handleAddInlineEssential(category)}
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost-button studio-mini-button"
                                    onClick={() => {
                                      setAddingCategory(null);
                                      setNewEssentialDraft(emptyEssentialDraft);
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            {!isCollapsed ? (
                              <div className="essentials-list">
                                {items.map((item) => {
                                  const isEditing = editingEssentialId === item.id;

                                  return (
                                    <article
                                      className={`essential-row status-${item.packing_status}`}
                                      key={item.id}
                                      draggable
                                      onDragStart={() => setDraggedEssentialId(item.id)}
                                      onDragOver={(event) => event.preventDefault()}
                                      onDrop={() => void handleReorderEssentials(item.id)}
                                    >
                                      <div className="essential-row-copy">
                                        <div className="essential-row-head">
                                          <div>
                                            <p className="sku-label">Essential</p>
                                            {isEditing ? (
                                              <input
                                                className="text-input"
                                                value={editingEssentialDraft.title}
                                                onChange={(event) =>
                                                  setEditingEssentialDraft((current) => ({
                                                    ...current,
                                                    title: event.target.value,
                                                  }))
                                                }
                                              />
                                            ) : (
                                              <h2>{item.title}</h2>
                                            )}
                                          </div>
                                          <span className="trip-meta-pill">
                                            {formatEssentialInclusionType(item.inclusion_type)}
                                          </span>
                                        </div>
                                        {isEditing ? (
                                          <textarea
                                            className="text-area-input"
                                            value={editingEssentialDraft.notes}
                                            onChange={(event) =>
                                              setEditingEssentialDraft((current) => ({
                                                ...current,
                                                notes: event.target.value,
                                              }))
                                            }
                                          />
                                        ) : item.notes ? (
                                          <p className="trip-card-notes">{item.notes}</p>
                                        ) : null}
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

                                      <div className="essential-row-actions">
                                        {isEditing ? (
                                          <>
                                            <button
                                              type="button"
                                              className="primary-button studio-mini-button"
                                              onClick={() => void handleSaveEditedEssential(item)}
                                            >
                                              Save
                                            </button>
                                            <button
                                              type="button"
                                              className="ghost-button studio-mini-button"
                                              onClick={() => {
                                                setEditingEssentialId(null);
                                                setEditingEssentialDraft(emptyEssentialDraft);
                                              }}
                                            >
                                              Cancel
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <button
                                              type="button"
                                              className="ghost-button studio-mini-button"
                                              onClick={() => handleDuplicateEssential(item)}
                                            >
                                              Duplicate
                                            </button>
                                            <button
                                              type="button"
                                              className="ghost-button studio-mini-button"
                                              onClick={() => {
                                                setEditingEssentialId(item.id);
                                                setEditingEssentialDraft({
                                                  title: item.title,
                                                  notes: item.notes ?? "",
                                                });
                                              }}
                                            >
                                              Edit inline
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </article>
                                  );
                                })}
                              </div>
                            ) : null}
                          </section>
                        );
                      })}
                  </div>
                )}
              </div>
            ) : null}

            {activeTab === "catalogue" ? (
              <div className="travel-shell-grid">
                <TravelCataloguePanel mode="hub" />
              </div>
            ) : null}

            {activeTab === "summary" ? (
              <div className="dashboard dashboard-tight">
                <div className="travel-summary-dashboard">
                  <article className="detail-card travel-summary-header">
                    <div className="travel-summary-grid">
                      <SummaryRing label="Overall" value={summaryStats.overallProgress} />
                      <SummaryRing label="Wardrobe" value={summaryStats.wardrobeProgress} />
                      <SummaryRing label="Essentials" value={summaryStats.essentialsProgress} />
                      <SummaryRing
                        label="Looks"
                        value={selectedOutfitEntries.length ? 100 : 0}
                        helper={`${selectedOutfitEntries.length} selected`}
                      />
                    </div>
                  </article>

                  <div className="travel-shell-grid">
                    <article className="detail-card">
                      <p className="eyebrow">Trip snapshot</p>
                      <DetailGrid rows={detailRows} />
                    </article>

                    <article className="detail-card">
                      <p className="eyebrow">Category counts</p>
                      <div className="travel-count-list">
                        {wardrobeCategoryCounts.map((entry) => (
                          <div className="travel-count-row" key={entry.label}>
                            <span>{entry.label}</span>
                            <strong>{entry.count}</strong>
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>

                  <div className="travel-shell-grid">
                    <article className="detail-card">
                      <p className="eyebrow">Looks packed for this trip</p>
                      <div className="travel-summary-look-list">
                        {selectedOutfitEntries.map(({ outfit }) => (
                          <div className="travel-summary-look-row" key={outfit.id}>
                            <span>{outfit.title}</span>
                            <strong>{outfit.item_ids.length} items</strong>
                          </div>
                        ))}
                      </div>
                    </article>

                    <TravelCataloguePanel mode="summary" />
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </section>
      )}
    </main>
  );
}

function SummaryRing({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper?: string;
}) {
  return (
    <div className="travel-ring-card">
      <div
        className="travel-progress-ring"
        style={{ ["--travel-progress" as string]: `${Math.max(0, Math.min(100, value))}` }}
      >
        <div className="travel-progress-ring-inner">
          <strong>{value}%</strong>
        </div>
      </div>
      <div className="travel-ring-copy">
        <span>{label}</span>
        <small>{helper || "Completion"}</small>
      </div>
    </div>
  );
}
