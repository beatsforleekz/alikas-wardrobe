"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import travelCompleteIcon from "../../../images/complete.png";
import travelInProgressIcon from "../../../images/in-progress.png";

import { LoginForm } from "@/components/auth/login-form";
import { CollectionNav } from "@/components/navigation/collection-nav";
import { InternalBackButton } from "@/components/navigation/internal-back-button";
import { TravelCapsuleField } from "@/components/travel/travel-capsule-field";
import { TravelShellNav } from "@/components/travel/travel-shell-nav";
import { BrandedLoadingScreen } from "@/components/ui/branded-loading-screen";
import { DetailGrid } from "@/components/ui/detail-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { getInventoryItems } from "@/lib/data/inventory";
import { getOutfits } from "@/lib/data/outfits";
import {
  addTripOutfitLink,
  createEssentialLibraryItems,
  createTripLookCategory,
  createTripEssentialItems,
  deleteTripEssentialItem,
  deleteTripLookCategory,
  deleteTripOutfitLink,
  deleteTripWardrobeItemOutfitLinks,
  deleteTripWardrobeItems,
  getEssentialLibraryItems,
  getTripById,
  getTripLookCategories,
  getTripEssentialItems,
  getTripOutfitLinks,
  getTripWardrobeItemOutfitLinks,
  getTripWardrobeItems,
  reorderTripEssentialItems,
  reorderTripOutfitLinks,
  updateTripLookCategory,
  updateTripEssentialItem,
  upsertTripWardrobeItemOutfitLinks,
  upsertTripWardrobeItems,
} from "@/lib/data/travel";
import {
  getDisplayImage,
  isInventoryItemAvailableForNewUse,
  isUnavailableInventoryStatus,
  normalizeText,
} from "@/lib/inventory";
import {
  ESSENTIAL_CATEGORY_OPTIONS,
  formatPackingStatusLabel,
  formatEssentialInclusionType,
  formatTripDateRange,
  formatTripStatus,
  isEssentialRequired,
  isPackingStatusResolved,
  STARTER_ESSENTIAL_LIBRARY_ITEMS,
} from "@/lib/travel";
import { getOutfitDisplayImage } from "@/lib/outfits";
import { useWardrobeSession } from "@/hooks/use-wardrobe-session";
import type { InventoryItem } from "@/types/inventory";
import type { Outfit } from "@/types/outfit";
import type {
  EssentialLibraryItem,
  Trip,
  TripEssentialItem,
  TripLookCategory,
  TripOutfitLink,
  TripWardrobeItem,
  TripWardrobeItemOutfitLink,
} from "@/types/travel";

type TripStudioTab = "overview" | "looks" | "packing" | "essentials" | "summary";

const TRIP_STUDIO_TABS: Array<{ id: TripStudioTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "looks", label: "Looks" },
  { id: "packing", label: "Wardrobe Packing" },
  { id: "essentials", label: "Essentials" },
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

type SelectedOutfitEntry = {
  link: TripOutfitLink;
  outfit: Outfit;
};

type TripLookGroup = {
  id: string | null;
  name: string;
  sortOrder: number;
  isUncategorised: boolean;
  entries: SelectedOutfitEntry[];
};

const UNCAT_LOOK_GROUP_KEY = "__uncategorised__";

function getLookGroupKey(categoryId: string | null) {
  return categoryId ?? UNCAT_LOOK_GROUP_KEY;
}

function sortTripLinksWithinGroups(
  links: TripOutfitLink[],
  categories: TripLookCategory[],
) {
  const grouped = new Map<string, TripOutfitLink[]>();

  links.forEach((link) => {
    const key = getLookGroupKey(link.look_category_id);
    const current = grouped.get(key) ?? [];
    grouped.set(
      key,
      [...current, link].sort(
        (left, right) =>
          left.category_sort_order - right.category_sort_order || left.sort_order - right.sort_order,
      ),
    );
  });

  const ordered = [
    ...(grouped.get(UNCAT_LOOK_GROUP_KEY) ?? []),
    ...[...categories]
      .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name))
      .flatMap((category) => grouped.get(category.id) ?? []),
  ];

  return ordered.map((link, index) => {
    const categoryLinks = ordered.filter(
      (entry) => entry.look_category_id === link.look_category_id,
    );
    const categorySortOrder = categoryLinks.findIndex((entry) => entry.id === link.id);

    return {
      ...link,
      sort_order: index,
      category_sort_order: categorySortOrder === -1 ? 0 : categorySortOrder,
    };
  });
}

export function TripDetailShell({ tripId }: { tripId: string }) {
  const { supabase, session, isSessionLoading, handleLogin } = useWardrobeSession();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [tripLinks, setTripLinks] = useState<TripOutfitLink[]>([]);
  const [lookCategories, setLookCategories] = useState<TripLookCategory[]>([]);
  const [wardrobeItems, setWardrobeItems] = useState<TripWardrobeItem[]>([]);
  const [wardrobeItemLinks, setWardrobeItemLinks] = useState<TripWardrobeItemOutfitLink[]>([]);
  const [essentialLibraryItems, setEssentialLibraryItems] = useState<EssentialLibraryItem[]>([]);
  const [tripEssentialItems, setTripEssentialItems] = useState<TripEssentialItem[]>([]);
  const [activeTab, setActiveTab] = useState<TripStudioTab>("overview");
  const [lookQuery, setLookQuery] = useState("");
  const [newLookCategoryName, setNewLookCategoryName] = useState("");
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
          nextLookCategories,
          nextWardrobeItems,
          nextWardrobeItemLinks,
          nextLibraryItems,
          currentTripEssentials,
        ] = await Promise.all([
          getTripById(supabase, tripId),
          getOutfits(supabase),
          getInventoryItems(supabase),
          getTripOutfitLinks(supabase, tripId),
          getTripLookCategories(supabase, tripId),
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

        let activeLibraryItems = nextLibraryItems.filter((item) => !item.is_archived);

        if (activeLibraryItems.length === 0) {
          activeLibraryItems = await createEssentialLibraryItems(
            supabase,
            session.user.id,
            STARTER_ESSENTIAL_LIBRARY_ITEMS,
          );
        }

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
        setTripLinks(sortTripLinksWithinGroups(nextTripLinks, nextLookCategories));
        setLookCategories(nextLookCategories);
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
        .filter((entry): entry is SelectedOutfitEntry => Boolean(entry.outfit)),
    [outfits, tripLinks],
  );
  const selectedLookGroups = useMemo<TripLookGroup[]>(() => {
    const groups = new Map<string, TripLookGroup>();

    groups.set(UNCAT_LOOK_GROUP_KEY, {
      id: null,
      name: "Uncategorised",
      sortOrder: -1,
      isUncategorised: true,
      entries: [],
    });

    [...lookCategories]
      .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name))
      .forEach((category) => {
        groups.set(category.id, {
          id: category.id,
          name: category.name,
          sortOrder: category.sort_order,
          isUncategorised: false,
          entries: [],
        });
      });

    [...selectedOutfitEntries]
      .sort(
        (left, right) =>
          left.link.category_sort_order - right.link.category_sort_order ||
          left.link.sort_order - right.link.sort_order,
      )
      .forEach((entry) => {
        const key = getLookGroupKey(entry.link.look_category_id);
        const group = groups.get(key);

        if (group) {
          group.entries.push(entry);
        }
      });

    const uncategorisedGroup = groups.get(UNCAT_LOOK_GROUP_KEY);
    const customGroups = [...groups.values()].filter((group) => !group.isUncategorised);

    return uncategorisedGroup ? [...customGroups, uncategorisedGroup] : customGroups;
  }, [lookCategories, selectedOutfitEntries]);
  const filteredOutfits = useMemo(() => {
    const normalizedQuery = normalizeText(lookQuery);

    return outfits.filter((outfit) => {
      if (selectedOutfitIds.has(outfit.id)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [outfit.title, outfit.occasion, outfit.trip, outfit.tags.join(" "), outfit.item_ids.join(" ")]
        .filter(Boolean)
        .some((field) => normalizeText(field).includes(normalizedQuery));
    });
  }, [lookQuery, outfits, selectedOutfitIds]);
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
          isUnavailable: inventoryItem ? isUnavailableInventoryStatus(inventoryItem.status) : true,
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
  const unavailableWardrobeEntries = useMemo(
    () => filteredWardrobeEntries.filter((entry) => entry.isUnavailable),
    [filteredWardrobeEntries],
  );
  const packableWardrobeEntries = useMemo(
    () => filteredWardrobeEntries.filter((entry) => !entry.isUnavailable),
    [filteredWardrobeEntries],
  );
  const manualInventoryOptions = useMemo(() => {
    const packedIds = new Set(wardrobeItems.map((item) => item.wardrobe_item_id));

    return inventoryItems.filter((item) => {
      if (packedIds.has(item.item_id)) {
        return false;
      }

      if (!isInventoryItemAvailableForNewUse(item)) {
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
  const essentialsCategoryProgress = useMemo(
    () =>
      Object.entries(essentialsByCategory)
        .map(([category, items]) => {
          const requiredItems = items.filter((item) => isEssentialRequired(item.inclusion_type));
          const resolvedItems = requiredItems.filter((item) => isPackingStatusResolved(item.packing_status));
          const packedItems = items.filter((item) => item.packing_status === "packed");

          return {
            category,
            items,
            requiredCount: requiredItems.length,
            resolvedCount: resolvedItems.length,
            packedCount: packedItems.length,
            totalCount: items.length,
            progress: requiredItems.length
              ? Math.round((resolvedItems.length / requiredItems.length) * 100)
              : 100,
          };
        })
        .sort(
          (left, right) =>
            ESSENTIAL_CATEGORY_OPTIONS.indexOf(left.category as (typeof ESSENTIAL_CATEGORY_OPTIONS)[number]) -
              ESSENTIAL_CATEGORY_OPTIONS.indexOf(right.category as (typeof ESSENTIAL_CATEGORY_OPTIONS)[number]) ||
            left.category.localeCompare(right.category),
        ),
    [essentialsByCategory],
  );
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
    const availableWardrobeRows = wardrobeEntries.filter((entry) => !entry.isUnavailable).map((entry) => entry.row);
    const unavailableWardrobeCount = wardrobeEntries.filter((entry) => entry.isUnavailable).length;
    const wardrobeTotal = availableWardrobeRows.length;
    const wardrobePacked = availableWardrobeRows.filter((item) => item.packing_status === "packed").length;
    const wardrobeResolved = availableWardrobeRows.filter((item) => isPackingStatusResolved(item.packing_status)).length;
    const essentialsTotal = tripEssentialItems.length;
    const requiredEssentials = tripEssentialItems.filter((item) => isEssentialRequired(item.inclusion_type));
    const essentialsPacked = tripEssentialItems.filter((item) => item.packing_status === "packed").length;
    const essentialsResolved = requiredEssentials.filter((item) =>
      isPackingStatusResolved(item.packing_status),
    ).length;
    const totalRequired = wardrobeTotal + requiredEssentials.length;
    const totalResolved = wardrobeResolved + essentialsResolved;
    const packedTotal = wardrobePacked + essentialsPacked;
    const notRequiredCount =
      availableWardrobeRows.filter((item) => item.packing_status === "not_required").length +
      tripEssentialItems.filter((item) => item.packing_status === "not_required").length;
    const missingCount =
      availableWardrobeRows.filter((item) => item.packing_status === "missing").length +
      tripEssentialItems.filter((item) => item.packing_status === "missing").length;
    const suitcaseReady = totalRequired > 0 && totalResolved === totalRequired && missingCount === 0;

    return {
      looksTotal: selectedOutfitEntries.length,
      wardrobeTotal,
      wardrobePacked,
      wardrobeResolved,
      wardrobeProgress: wardrobeTotal ? Math.round((wardrobeResolved / wardrobeTotal) * 100) : 0,
      essentialsTotal,
      essentialsPacked,
      essentialsRequired: requiredEssentials.length,
      essentialsResolved,
      essentialsProgress: requiredEssentials.length
        ? Math.round((essentialsResolved / requiredEssentials.length) * 100)
        : 100,
      overallProgress: totalRequired ? Math.round((totalResolved / totalRequired) * 100) : 100,
      packedTotal,
      totalRequired,
      totalResolved,
      missingCount,
      notRequiredCount,
      unavailableWardrobeCount,
      optionalEssentials: essentialsTotal - requiredEssentials.length,
      suitcaseReady,
    };
  }, [selectedOutfitEntries.length, tripEssentialItems, wardrobeEntries]);

  async function refreshTripPacking(nextLinks = tripLinks) {
    if (!session || !trip) {
      return;
    }

    setIsSyncing(true);
    setErrorMessage("");

    try {
      const derivedMap = new Map<string, string[]>();
      const inventoryMap = new Map(inventoryItems.map((item) => [item.item_id.trim().toUpperCase(), item]));

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
        const inventoryItem = inventoryMap.get(itemId) ?? null;
        return {
          trip_id: trip.id,
          user_id: session.user.id,
          wardrobe_item_id: itemId,
          source: existing?.source ?? "outfit",
          packing_status:
            existing?.packing_status ??
            (inventoryItem && !isInventoryItemAvailableForNewUse(inventoryItem) ? "missing" : "pending"),
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
      const existingPairs = new Set(
        currentLinks.map((link) => `${link.trip_wardrobe_item_id}:${link.trip_outfit_id}`),
      );
      const missingLinkRows = desiredLinkRows.filter(
        (row) => !existingPairs.has(`${row.trip_wardrobe_item_id}:${row.trip_outfit_id}`),
      );

      if (obsoleteLinkIds.length > 0) {
        await deleteTripWardrobeItemOutfitLinks(supabase, obsoleteLinkIds);
      }

      if (missingLinkRows.length > 0) {
        await upsertTripWardrobeItemOutfitLinks(supabase, missingLinkRows);
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
      null,
      selectedOutfitEntries.filter((entry) => entry.link.look_category_id === null).length,
    );
    const nextLinks = [...tripLinks, nextLink];
    setTripLinks(sortTripLinksWithinGroups(nextLinks, lookCategories));
    await refreshTripPacking(nextLinks);
    setNotice(`${outfit.title} added to this trip.`);
  }

  async function persistTripLookOrder(nextLinks: TripOutfitLink[]) {
    const resequenced = sortTripLinksWithinGroups(nextLinks, lookCategories);
    setTripLinks(resequenced);
    setDraggedTripLinkId("");

    try {
      const persisted = await reorderTripOutfitLinks(supabase, resequenced);
      setTripLinks(sortTripLinksWithinGroups(persisted, lookCategories));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to reorder looks.");
    }
  }

  async function handleDropOnLook(targetLinkId: string, targetCategoryId: string | null) {
    if (!draggedTripLinkId) {
      return;
    }

    if (draggedTripLinkId === targetLinkId) {
      setDraggedTripLinkId("");
      return;
    }

    const movedLink = tripLinks.find((link) => link.id === draggedTripLinkId);
    const targetLink = tripLinks.find((link) => link.id === targetLinkId);

    if (!movedLink || !targetLink) {
      setDraggedTripLinkId("");
      return;
    }

    const targetGroupEntries = selectedOutfitEntries.filter(
      (entry) => entry.link.look_category_id === targetCategoryId && entry.link.id !== draggedTripLinkId,
    );
    const targetIndex = targetGroupEntries.findIndex((entry) => entry.link.id === targetLink.id);
    const nextGroupLinks = [...targetGroupEntries.map((entry) => entry.link)];
    nextGroupLinks.splice(
      targetIndex === -1 ? nextGroupLinks.length : targetIndex,
      0,
      { ...movedLink, look_category_id: targetCategoryId },
    );

    const nextLinks = tripLinks
      .filter(
        (link) =>
          link.id !== draggedTripLinkId &&
          !(link.look_category_id === targetCategoryId && link.id !== draggedTripLinkId),
      )
      .concat(nextGroupLinks);

    await persistTripLookOrder(nextLinks);
  }

  async function handleDropOnCategory(targetCategoryId: string | null) {
    if (!draggedTripLinkId) {
      return;
    }

    const movedLink = tripLinks.find((link) => link.id === draggedTripLinkId);

    if (!movedLink) {
      setDraggedTripLinkId("");
      return;
    }

    const nextLinks = [
      ...tripLinks.filter((link) => link.id !== draggedTripLinkId),
      { ...movedLink, look_category_id: targetCategoryId },
    ];

    await persistTripLookOrder(nextLinks);
  }

  async function handleAssignLookToCategory(linkId: string, targetCategoryId: string | null) {
    const movedLink = tripLinks.find((link) => link.id === linkId);

    if (!movedLink) {
      return;
    }

    const nextLinks = [
      ...tripLinks.filter((link) => link.id !== linkId),
      { ...movedLink, look_category_id: targetCategoryId },
    ];

    await persistTripLookOrder(nextLinks);
  }

  async function handleCreateLookCategory() {
    if (!session || !trip || !newLookCategoryName.trim()) {
      return;
    }

    try {
      const created = await createTripLookCategory(
        supabase,
        session.user.id,
        trip.id,
        newLookCategoryName,
        lookCategories.length,
      );
      setLookCategories((current) =>
        [...current, created].sort((left, right) => left.sort_order - right.sort_order),
      );
      setNewLookCategoryName("");
      setNotice(`${created.name} added to this trip.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create look category.");
    }
  }

  async function handleMoveLookCategory(categoryId: string, direction: -1 | 1) {
    const currentIndex = lookCategories.findIndex((category) => category.id === categoryId);
    const targetIndex = currentIndex + direction;

    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= lookCategories.length) {
      return;
    }

    const nextCategories = [...lookCategories];
    const [moved] = nextCategories.splice(currentIndex, 1);
    nextCategories.splice(targetIndex, 0, moved);
    const resequenced = nextCategories.map((category, index) => ({
      ...category,
      sort_order: index,
    }));

    setLookCategories(resequenced);

    try {
      const persisted = await Promise.all(
        resequenced.map((category) =>
          updateTripLookCategory(supabase, category.id, { sort_order: category.sort_order }),
        ),
      );
      setLookCategories(persisted.sort((left, right) => left.sort_order - right.sort_order));
      setTripLinks((current) => sortTripLinksWithinGroups(current, persisted));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to reorder look categories.");
    }
  }

  async function handleRenameLookCategory(category: TripLookCategory) {
    const nextName = window.prompt("Rename this look category.", category.name)?.trim();

    if (!nextName || nextName === category.name) {
      return;
    }

    try {
      const updated = await updateTripLookCategory(supabase, category.id, { name: nextName });
      setLookCategories((current) =>
        current.map((entry) => (entry.id === category.id ? updated : entry)),
      );
      setNotice(`${category.name} renamed to ${updated.name}.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to rename look category.");
    }
  }

  async function handleDeleteLookCategory(category: TripLookCategory) {
    const action = window
      .prompt(
        `Remove "${category.name}". Type "uncategorized" to move looks into Uncategorised, "remove" to remove those looks from the trip, or leave blank to cancel.`,
        "uncategorized",
      )
      ?.trim()
      .toLowerCase();

    if (!action) {
      return;
    }

    const affectedLinks = tripLinks.filter((link) => link.look_category_id === category.id);

    try {
      if (action === "remove") {
        await Promise.all(affectedLinks.map((link) => deleteTripOutfitLink(supabase, link.id)));
        const nextLinks = tripLinks.filter((link) => link.look_category_id !== category.id);
        await deleteTripLookCategory(supabase, category.id);
        const nextCategories = lookCategories.filter((entry) => entry.id !== category.id);
        setLookCategories(nextCategories);
        setTripLinks(sortTripLinksWithinGroups(nextLinks, nextCategories));
        await refreshTripPacking(nextLinks);
        setNotice(`${category.name} removed, along with its selected looks.`);
        return;
      }

      if (action !== "uncategorized") {
        return;
      }

      const nextCategories = lookCategories.filter((entry) => entry.id !== category.id);
      const nextLinks = tripLinks.map((link) =>
        link.look_category_id === category.id ? { ...link, look_category_id: null } : link,
      );
      const resequenced = sortTripLinksWithinGroups(nextLinks, nextCategories);
      await reorderTripOutfitLinks(supabase, resequenced);
      await deleteTripLookCategory(supabase, category.id);
      setLookCategories(nextCategories);
      setTripLinks(resequenced);
      setNotice(`${category.name} removed. Its looks were moved to Uncategorised.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to remove look category.");
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

  async function handleDeleteEssential(item: TripEssentialItem) {
    const confirmed = window.confirm(`Remove "${item.title}" from this trip checklist?`);

    if (!confirmed) {
      return;
    }

    await deleteTripEssentialItem(supabase, item.id);
    setTripEssentialItems((current) => current.filter((entry) => entry.id !== item.id));
    if (editingEssentialId === item.id) {
      setEditingEssentialId(null);
      setEditingEssentialDraft(emptyEssentialDraft);
    }
    setNotice(`${item.title} removed from this trip.`);
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
  const packedWardrobeEntries = useMemo(
    () => wardrobeEntries.filter((entry) => entry.row.packing_status === "packed"),
    [wardrobeEntries],
  );
  const packedEssentialEntries = useMemo(
    () => tripEssentialItems.filter((item) => item.packing_status === "packed"),
    [tripEssentialItems],
  );
  const notRequiredSummaryRows = useMemo(
    () => [
      ...wardrobeEntries
        .filter((entry) => entry.row.packing_status === "not_required")
        .map((entry) => ({
          id: entry.row.id,
          label: entry.inventoryItem?.item_name || entry.row.wardrobe_item_id,
          meta: `Wardrobe • ${entry.row.wardrobe_item_id}`,
        })),
      ...tripEssentialItems
        .filter((item) => item.packing_status === "not_required")
        .map((item) => ({
          id: item.id,
          label: item.title,
          meta: `Essential • ${item.category}`,
        })),
    ],
    [tripEssentialItems, wardrobeEntries],
  );
  const missingSummaryRows = useMemo(
    () => [
      ...wardrobeEntries
        .filter((entry) => entry.row.packing_status === "missing" && !entry.isUnavailable)
        .map((entry) => ({
          id: entry.row.id,
          label: entry.inventoryItem?.item_name || entry.row.wardrobe_item_id,
          meta: `Wardrobe • ${entry.row.wardrobe_item_id}`,
        })),
      ...tripEssentialItems
        .filter((item) => item.packing_status === "missing")
        .map((item) => ({
          id: item.id,
          label: item.title,
          meta: `Essential • ${item.category}`,
        })),
    ],
    [tripEssentialItems, wardrobeEntries],
  );
  const unavailableSummaryRows = useMemo(
    () =>
      wardrobeEntries
        .filter((entry) => entry.isUnavailable)
        .map((entry) => ({
          id: entry.row.id,
          label: entry.inventoryItem?.item_name || entry.row.wardrobe_item_id,
          meta: `Wardrobe • ${entry.inventoryItem?.status || "Unavailable"}`,
        })),
    [wardrobeEntries],
  );

  if (isSessionLoading) {
    return <BrandedLoadingScreen title="Taking off to Travel Suite" theme="travel" />;
  }

  if (!session) {
    return <LoginForm onSubmit={handleLogin} />;
  }

  if (isLoading) {
    return <BrandedLoadingScreen title="Taking off to Travel Suite" theme="travel" />;
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
              <span className="trip-meta-pill">{summaryStats.totalResolved} of {summaryStats.totalRequired} ready</span>
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
                    <SummaryRing
                      label="Overall"
                      value={summaryStats.overallProgress}
                      helper={`${summaryStats.totalResolved}/${summaryStats.totalRequired} ready`}
                    />
                    <SummaryRing
                      label="Wardrobe"
                      value={summaryStats.wardrobeProgress}
                      helper={`${summaryStats.wardrobeResolved}/${summaryStats.wardrobeTotal} resolved`}
                    />
                    <SummaryRing
                      label="Essentials"
                      value={summaryStats.essentialsProgress}
                      helper={`${summaryStats.essentialsResolved}/${summaryStats.essentialsRequired} required`}
                    />
                  </div>
                </article>

                <article className={`detail-card suitcase-ready-card ${summaryStats.suitcaseReady ? "is-complete" : ""}`}>
                  <div className="suitcase-ready-icon" aria-hidden="true">
                    <Image
                      src={summaryStats.suitcaseReady ? travelCompleteIcon : travelInProgressIcon}
                      alt=""
                      className="suitcase-ready-icon-image"
                    />
                  </div>
                  <div className="suitcase-ready-copy">
                    <p className="eyebrow">{summaryStats.suitcaseReady ? "Suitcase ready" : "Packing in progress"}</p>
                    <h3>
                      {summaryStats.suitcaseReady
                        ? "Everything required for this trip has been resolved."
                        : "Keep going until every required piece is packed or marked not required."}
                    </h3>
                    <p>
                      Wardrobe: {summaryStats.wardrobeResolved}/{summaryStats.wardrobeTotal} resolved • Essentials:{" "}
                      {summaryStats.essentialsResolved}/{summaryStats.essentialsRequired} required resolved
                    </p>
                  </div>
                </article>

                <article className="detail-card">
                  <p className="eyebrow">Packing snapshot</p>
                  <div className="travel-quick-stats">
                    <TravelStatCard label="Packed items" value={`${summaryStats.packedTotal}`} />
                    <TravelStatCard label="Not required" value={`${summaryStats.notRequiredCount}`} />
                    <TravelStatCard label="Missing" value={`${summaryStats.missingCount}`} />
                    <TravelStatCard label="Looks selected" value={`${summaryStats.looksTotal}`} />
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
                        <p>Build custom trip groups, then assign each look into the right moment.</p>
                      </div>
                    </div>

                    <article className="travel-look-category-manager">
                      <div className="travel-look-category-manager-head">
                        <div>
                          <p className="eyebrow">Look categories</p>
                          <h3>Organise selected looks</h3>
                        </div>
                        <span className="trip-meta-pill">{lookCategories.length} custom groups</span>
                      </div>

                      <div className="travel-look-category-create">
                        <input
                          className="search-input"
                          type="text"
                          value={newLookCategoryName}
                          placeholder="Add a category like Airport, Dinner, Beach Club"
                          onChange={(event) => setNewLookCategoryName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              void handleCreateLookCategory();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => void handleCreateLookCategory()}
                        >
                          Add category
                        </button>
                      </div>

                      <div className="travel-look-category-chip-row">
                        <span className="trip-meta-pill trip-meta-pill-muted">Uncategorised</span>
                        {lookCategories.map((category) => (
                          <span key={category.id} className="trip-meta-pill">
                            {category.name}
                          </span>
                        ))}
                      </div>

                      <p className="travel-look-category-note">
                        Assign looks with the Group menu on each card, or drag a selected look into a category section below.
                      </p>
                    </article>

                    {selectedOutfitEntries.length === 0 ? (
                      <EmptyState
                        compact
                        title="No looks selected yet"
                        description="Choose outfits below to start building the trip wardrobe."
                      />
                    ) : (
                      <div className="travel-look-category-board">
                        {selectedLookGroups.map((group, groupIndex) => (
                          (() => {
                            const groupCollapseKey = `look-group:${group.id ?? UNCAT_LOOK_GROUP_KEY}`;
                            const isGroupCollapsed = collapsedCategories[groupCollapseKey] ?? false;

                            return (
                          <section
                            key={group.id ?? UNCAT_LOOK_GROUP_KEY}
                            className="travel-look-category-card"
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => void handleDropOnCategory(group.id)}
                          >
                            <div className="travel-look-category-head">
                              <div>
                                <p className="eyebrow">{group.isUncategorised ? "Default group" : "Trip look category"}</p>
                                <h3>{group.name}</h3>
                              </div>
                              <div className="travel-look-category-meta">
                                <span className="trip-meta-pill">{group.entries.length} looks</span>
                                <button
                                  type="button"
                                  className="ghost-button studio-mini-button"
                                  onClick={() =>
                                    setCollapsedCategories((current) => ({
                                      ...current,
                                      [groupCollapseKey]: !isGroupCollapsed,
                                    }))
                                  }
                                >
                                  {isGroupCollapsed ? "Expand" : "Collapse"}
                                </button>
                                {!group.isUncategorised && group.id ? (
                                  <>
                                    <button
                                      type="button"
                                      className="ghost-button studio-mini-button"
                                      onClick={() => void handleMoveLookCategory(group.id!, -1)}
                                      disabled={groupIndex === 1}
                                    >
                                      Up
                                    </button>
                                    <button
                                      type="button"
                                      className="ghost-button studio-mini-button"
                                      onClick={() => void handleMoveLookCategory(group.id!, 1)}
                                      disabled={groupIndex === selectedLookGroups.length - 1}
                                    >
                                      Down
                                    </button>
                                    <button
                                      type="button"
                                      className="ghost-button studio-mini-button"
                                      onClick={() =>
                                        void handleRenameLookCategory(
                                          lookCategories.find((category) => category.id === group.id)!,
                                        )
                                      }
                                    >
                                      Rename
                                    </button>
                                    <button
                                      type="button"
                                      className="ghost-button studio-mini-button"
                                      onClick={() =>
                                        void handleDeleteLookCategory(
                                          lookCategories.find((category) => category.id === group.id)!,
                                        )
                                      }
                                    >
                                      Remove
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </div>

                            {isGroupCollapsed ? null : group.entries.length === 0 ? (
                              <div className="travel-look-category-empty">
                                Drop a selected look here to organise this trip.
                              </div>
                            ) : (
                              <div className="travel-lookbook-board">
                                {group.entries.map(({ link, outfit }) => {
                                  const imageUrl = getOutfitDisplayImage(outfit);

                                  return (
                                    <article
                                      key={link.id}
                                      className="travel-lookbook-card is-selected"
                                      draggable
                                      onDragStart={() => setDraggedTripLinkId(link.id)}
                                      onDragOver={(event) => event.preventDefault()}
                                      onDrop={() => void handleDropOnLook(link.id, group.id)}
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
                                        <p className="sku-label">{group.name}</p>
                                        <h3>{outfit.title}</h3>
                                        <p className="travel-lookbook-meta">
                                          {outfit.occasion || outfit.trip || "Lookbook"} • {outfit.item_ids.length} items
                                        </p>
                                        <label className="field travel-look-group-field">
                                          <span>Group</span>
                                          <select
                                            className="filter-select"
                                            value={link.look_category_id ?? ""}
                                            onChange={(event) =>
                                              void handleAssignLookToCategory(
                                                link.id,
                                                event.target.value || null,
                                              )
                                            }
                                          >
                                            <option value="">Uncategorised</option>
                                            {lookCategories.map((category) => (
                                              <option key={category.id} value={category.id}>
                                                {category.name}
                                              </option>
                                            ))}
                                          </select>
                                        </label>
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
                          </section>
                            );
                          })()
                        ))}
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

                <div className="travel-summary-grid">
                  <article className="detail-card travel-summary-card">
                    <strong>{summaryStats.wardrobeProgress}%</strong>
                    <span>
                      {summaryStats.wardrobeResolved} of {summaryStats.wardrobeTotal} resolved
                    </span>
                  </article>
                  <article className="detail-card travel-summary-card">
                    <strong>{summaryStats.packedTotal}</strong>
                    <span>Packed wardrobe and essentials combined</span>
                  </article>
                  <article className="detail-card travel-summary-card">
                    <strong>{summaryStats.notRequiredCount}</strong>
                    <span>Marked not required</span>
                  </article>
                  <article className="detail-card travel-summary-card">
                    <strong>{summaryStats.missingCount}</strong>
                    <span>Still missing</span>
                  </article>
                  <article className="detail-card travel-summary-card">
                    <strong>{summaryStats.unavailableWardrobeCount}</strong>
                    <span>Unavailable wardrobe items</span>
                  </article>
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

                <TravelCapsuleField
                  tripId={trip.id}
                  title="Linked capsule"
                  description="Optional trip-specific capsule link, folder, or planning note for this packing flow."
                />

                {packableWardrobeEntries.length === 0 && unavailableWardrobeEntries.length === 0 ? (
                  <EmptyState
                    compact
                    title="No wardrobe items packed yet"
                    description="Select looks or manually add wardrobe pieces to begin packing."
                  />
                ) : (
                  <>
                    {packableWardrobeEntries.length > 0 ? (
                      <div className="inventory-grid">
                        {packableWardrobeEntries.map(({ row, inventoryItem, usedInOutfits }) => {
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

                              <div className="travel-item-status-row">
                                <span className={`trip-status-pill status-${row.packing_status}`}>
                                  {formatPackingStatusLabel(row.packing_status)}
                                </span>
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
                    ) : null}

                    {unavailableWardrobeEntries.length > 0 ? (
                      <article className="detail-card">
                        <div className="results-copy">
                          <p className="results-heading">Missing / unavailable</p>
                          <p>These linked wardrobe pieces are no longer available and are excluded from packable progress.</p>
                        </div>

                        <div className="inventory-grid unavailable-grid">
                          {unavailableWardrobeEntries.map(({ row, inventoryItem, usedInOutfits }) => {
                            const imageUrl = inventoryItem ? getDisplayImage(inventoryItem.image) : null;

                            return (
                              <article className="inventory-card travel-packing-card is-unavailable" key={row.id}>
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
                                      <span>{inventoryItem?.status || "Unavailable"}</span>
                                    </div>
                                  </div>

                                  <div className="travel-item-status-row">
                                    <span className="trip-status-pill status-missing">Unavailable</span>
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

                                  <p className="linked-item-warning">This item is no longer available and will not be counted as packable.</p>
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </article>
                    ) : null}
                  </>
                )}

                <article className="detail-card">
                  <div className="results-bar">
                    <div className="results-copy">
                      <p className="results-heading">Manual add</p>
                      <p>Add extra wardrobe pieces beyond the selected looks.</p>
                    </div>
                  </div>

                  <div className="travel-manual-grid">
                    {manualInventoryOptions.slice(0, 8).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="travel-manual-card"
                        onClick={() => void handleAddManualItem(item)}
                      >
                        <div className="travel-manual-card-media">
                          {getDisplayImage(item.image) ? (
                            <Image
                              src={getDisplayImage(item.image)!}
                              alt={item.item_name || item.item_id}
                              fill
                              sizes="(max-width: 768px) 40vw, 12vw"
                              className="travel-lookbook-image"
                            />
                          ) : (
                            <div className="card-image-fallback">No image available</div>
                          )}
                        </div>
                        <div className="travel-manual-card-body">
                          <p className="sku-label">{item.item_id}</p>
                          <h3>{item.item_name || item.item_id}</h3>
                          <p>{item.category || "Wardrobe piece"}</p>
                        </div>
                        <span className="trip-meta-pill">Add to trip</span>
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
                    {essentialsCategoryProgress.map(({ category, items, packedCount, totalCount, requiredCount, resolvedCount, progress }) => {
                        const isCollapsed = collapsedCategories[category] ?? false;

                        return (
                          <section className="detail-card essentials-group-card" key={category}>
                            <div className="results-bar">
                              <div className="results-copy">
                                <p className="results-heading">{category}</p>
                                <p>
                                  {packedCount} packed • {resolvedCount} of {requiredCount} required resolved
                                </p>
                              </div>
                              <div className="travel-essentials-toolbar">
                                <span className="trip-meta-pill trip-meta-pill-muted">
                                  {packedCount}/{totalCount}
                                </span>
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

                            <div className="travel-category-progress">
                              <div
                                className="travel-category-progress-bar"
                                style={{ width: `${Math.max(6, progress)}%` }}
                              />
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
                                              onClick={() => void handleUpdateEssentialStatus(
                                                item,
                                                item.packing_status === "packed" ? "pending" : "packed",
                                              )}
                                            >
                                              {item.packing_status === "packed" ? "Unpack" : "Pack"}
                                            </button>
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
                                            <button
                                              type="button"
                                              className="ghost-button studio-mini-button danger-button"
                                              onClick={() => void handleDeleteEssential(item)}
                                            >
                                              Delete
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

            {activeTab === "summary" ? (
              <div className="dashboard dashboard-tight">
                <div className="travel-summary-dashboard">
                  <article className={`detail-card travel-summary-header ${summaryStats.suitcaseReady ? "is-complete" : ""}`}>
                    <div className="travel-summary-grid">
                      <SummaryRing
                        label="Overall"
                        value={summaryStats.overallProgress}
                        helper={`${summaryStats.totalResolved}/${summaryStats.totalRequired} ready`}
                      />
                      <SummaryRing
                        label="Wardrobe"
                        value={summaryStats.wardrobeProgress}
                        helper={`${summaryStats.wardrobeResolved}/${summaryStats.wardrobeTotal} resolved`}
                      />
                      <SummaryRing
                        label="Essentials"
                        value={summaryStats.essentialsProgress}
                        helper={`${summaryStats.essentialsResolved}/${summaryStats.essentialsRequired} required`}
                      />
                      <SummaryRing
                        label="Looks"
                        value={selectedOutfitEntries.length ? 100 : 0}
                        helper={`${selectedOutfitEntries.length} selected`}
                      />
                    </div>
                    <div className="travel-summary-banner">
                      <div className="suitcase-ready-icon" aria-hidden="true">
                        <Image
                          src={summaryStats.suitcaseReady ? travelCompleteIcon : travelInProgressIcon}
                          alt=""
                          className="suitcase-ready-icon-image"
                        />
                      </div>
                      <div className="suitcase-ready-copy">
                        <p className="eyebrow">{summaryStats.suitcaseReady ? "Suitcase ready" : "Still packing"}</p>
                        <h3>
                          {summaryStats.suitcaseReady
                            ? "Your trip is ready to close and go."
                            : "Use the sections below to finish the last required pieces."}
                        </h3>
                      </div>
                    </div>
                  </article>

                  <div className="travel-shell-grid">
                    <article className="detail-card">
                      <p className="eyebrow">Trip snapshot</p>
                      <DetailGrid rows={detailRows} />
                    </article>

                    <article className="detail-card">
                      <p className="eyebrow">Packing counts</p>
                      <div className="travel-count-list">
                        <div className="travel-count-row">
                          <span>Total packed items</span>
                          <strong>{summaryStats.packedTotal}</strong>
                        </div>
                        <div className="travel-count-row">
                          <span>Wardrobe packed</span>
                          <strong>{summaryStats.wardrobePacked}</strong>
                        </div>
                        <div className="travel-count-row">
                          <span>Essentials packed</span>
                          <strong>{summaryStats.essentialsPacked}</strong>
                        </div>
                        <div className="travel-count-row">
                          <span>Not required</span>
                          <strong>{summaryStats.notRequiredCount}</strong>
                        </div>
                        <div className="travel-count-row">
                          <span>Missing</span>
                          <strong>{summaryStats.missingCount}</strong>
                        </div>
                        <div className="travel-count-row">
                          <span>Optional essentials</span>
                          <strong>{summaryStats.optionalEssentials}</strong>
                        </div>
                      </div>
                    </article>
                  </div>

                  <div className="travel-shell-grid">
                    <article className="detail-card">
                      <p className="eyebrow">Wardrobe category counts</p>
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

                    <TravelCapsuleField
                      tripId={trip.id}
                      title="Linked capsule"
                      description="Optional capsule reference saved for this trip."
                      compact
                    />
                  </div>

                  <div className="travel-shell-grid">
                    <article className="detail-card">
                      <p className="eyebrow">Packed wardrobe</p>
                      <div className="travel-summary-look-list">
                        {packedWardrobeEntries.length === 0 ? (
                          <div className="travel-summary-look-row">
                            <span>No wardrobe pieces packed yet</span>
                            <strong>0</strong>
                          </div>
                        ) : (
                          packedWardrobeEntries.map(({ row, inventoryItem }) => (
                            <div className="travel-summary-look-row" key={row.id}>
                              <span>{inventoryItem?.item_name || row.wardrobe_item_id}</span>
                              <strong>{row.wardrobe_item_id}</strong>
                            </div>
                          ))
                        )}
                      </div>
                    </article>

                    <article className="detail-card">
                      <p className="eyebrow">Packed essentials</p>
                      <div className="travel-summary-look-list">
                        {packedEssentialEntries.length === 0 ? (
                          <div className="travel-summary-look-row">
                            <span>No essentials packed yet</span>
                            <strong>0</strong>
                          </div>
                        ) : (
                          packedEssentialEntries.map((item) => (
                            <div className="travel-summary-look-row" key={item.id}>
                              <span>{item.title}</span>
                              <strong>{item.category}</strong>
                            </div>
                          ))
                        )}
                      </div>
                    </article>
                  </div>

                  <div className="travel-shell-grid">
                    <article className="detail-card">
                      <p className="eyebrow">Not required</p>
                      <div className="travel-summary-look-list">
                        {notRequiredSummaryRows.length === 0 ? (
                          <div className="travel-summary-look-row">
                            <span>Nothing marked not required</span>
                            <strong>0</strong>
                          </div>
                        ) : (
                          notRequiredSummaryRows.map((item) => (
                            <div className="travel-summary-look-row" key={item.id}>
                              <span>{item.label}</span>
                              <strong>{item.meta}</strong>
                            </div>
                          ))
                        )}
                      </div>
                    </article>

                    <article className="detail-card">
                      <p className="eyebrow">Missing</p>
                      <div className="travel-summary-look-list">
                        {missingSummaryRows.length === 0 ? (
                          <div className="travel-summary-look-row">
                            <span>Nothing missing</span>
                            <strong>0</strong>
                          </div>
                        ) : (
                          missingSummaryRows.map((item) => (
                            <div className="travel-summary-look-row" key={item.id}>
                              <span>{item.label}</span>
                              <strong>{item.meta}</strong>
                            </div>
                          ))
                        )}
                      </div>
                    </article>

                    <article className="detail-card">
                      <p className="eyebrow">Unavailable</p>
                      <div className="travel-summary-look-list">
                        {unavailableSummaryRows.length === 0 ? (
                          <div className="travel-summary-look-row">
                            <span>No unavailable wardrobe items</span>
                            <strong>0</strong>
                          </div>
                        ) : (
                          unavailableSummaryRows.map((item) => (
                            <div className="travel-summary-look-row" key={item.id}>
                              <span>{item.label}</span>
                              <strong>{item.meta}</strong>
                            </div>
                          ))
                        )}
                      </div>
                    </article>
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

function TravelStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="travel-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
