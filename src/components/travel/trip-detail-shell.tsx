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
import { RemoteImage } from "@/components/ui/remote-image";
import {
  getInventoryItemsByItemIds,
  searchInventoryItems,
  updateInventoryItemStatus,
} from "@/lib/data/inventory";
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
  getTripItemReturns,
  getTripLookCategories,
  getTripEssentialItems,
  getTripOutfitLinks,
  getTripWardrobeItemOutfitLinks,
  getTripWardrobeItems,
  reorderTripEssentialItems,
  reorderTripOutfitLinks,
  updateTrip,
  updateTripLookCategory,
  updateTripEssentialItem,
  upsertTripItemReturn,
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
  formatTripCapsuleStatus,
  formatTripDateRange,
  formatTripReturnStatus,
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
  TripItemReturn,
  TripLookCategory,
  TripOutfitLink,
  TripWardrobeItem,
  TripWardrobeItemOutfitLink,
} from "@/types/travel";

type TripStudioTab =
  | "overview"
  | "capsule"
  | "packing"
  | "essentials"
  | "packed_summary"
  | "travel_wardrobe";

const TRIP_STUDIO_TABS: Array<{ id: TripStudioTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "capsule", label: "Capsule" },
  { id: "packing", label: "Packing" },
  { id: "essentials", label: "Essentials" },
  { id: "packed_summary", label: "Packed Summary" },
  { id: "travel_wardrobe", label: "Travel Wardrobe" },
];

type EssentialDraft = {
  title: string;
  notes: string;
};

const emptyEssentialDraft: EssentialDraft = {
  title: "",
  notes: "",
};

type TripEssentialsView = "checklist" | "to_get";

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

function mergeInventoryCaches(
  currentItems: InventoryItem[],
  nextItems: InventoryItem[],
) {
  const merged = new Map(currentItems.map((item) => [item.item_id, item]));
  nextItems.forEach((item) => merged.set(item.item_id, item));
  return [...merged.values()].sort((left, right) => left.item_id.localeCompare(right.item_id));
}

export function TripDetailShell({ tripId }: { tripId: string }) {
  const { supabase, session, isSessionLoading, handleLogin } = useWardrobeSession();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [manualSearchItems, setManualSearchItems] = useState<InventoryItem[]>([]);
  const [tripLinks, setTripLinks] = useState<TripOutfitLink[]>([]);
  const [lookCategories, setLookCategories] = useState<TripLookCategory[]>([]);
  const [wardrobeItems, setWardrobeItems] = useState<TripWardrobeItem[]>([]);
  const [wardrobeItemLinks, setWardrobeItemLinks] = useState<TripWardrobeItemOutfitLink[]>([]);
  const [tripItemReturns, setTripItemReturns] = useState<TripItemReturn[]>([]);
  const [essentialLibraryItems, setEssentialLibraryItems] = useState<EssentialLibraryItem[]>([]);
  const [tripEssentialItems, setTripEssentialItems] = useState<TripEssentialItem[]>([]);
  const [activeTab, setActiveTab] = useState<TripStudioTab>("overview");
  const [lookQuery, setLookQuery] = useState("");
  const [newLookCategoryName, setNewLookCategoryName] = useState("");
  const [packingQuery, setPackingQuery] = useState("");
  const [manualAddQuery, setManualAddQuery] = useState("");
  const [isManualSearchLoading, setIsManualSearchLoading] = useState(false);
  const [packingCategory, setPackingCategory] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [newEssentialDraft, setNewEssentialDraft] = useState<EssentialDraft>(emptyEssentialDraft);
  const [editingEssentialId, setEditingEssentialId] = useState<string | null>(null);
  const [editingEssentialDraft, setEditingEssentialDraft] = useState<EssentialDraft>(emptyEssentialDraft);
  const [essentialsView, setEssentialsView] = useState<TripEssentialsView>("checklist");
  const [openEssentialMenuId, setOpenEssentialMenuId] = useState<string | null>(null);
  const [draggedTripLinkId, setDraggedTripLinkId] = useState("");
  const [draggedEssentialId, setDraggedEssentialId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCompletingTrip, setIsCompletingTrip] = useState(false);
  const [showReturnFlow, setShowReturnFlow] = useState(false);
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
          nextTripLinks,
          nextLookCategories,
          nextWardrobeItems,
          nextWardrobeItemLinks,
          nextTripItemReturns,
          nextLibraryItems,
          currentTripEssentials,
        ] = await Promise.all([
          getTripById(supabase, tripId),
          getOutfits(supabase),
          getTripOutfitLinks(supabase, tripId),
          getTripLookCategories(supabase, tripId),
          getTripWardrobeItems(supabase, tripId),
          getTripWardrobeItemOutfitLinks(supabase, tripId),
          getTripItemReturns(supabase, tripId),
          getEssentialLibraryItems(supabase),
          getTripEssentialItems(supabase, tripId),
        ]);

        if (!nextTrip) {
          if (isActive) {
            setTrip(null);
          }
          return;
        }

        const nextInventory = await getInventoryItemsByItemIds(
          supabase,
          nextWardrobeItems.map((item) => item.wardrobe_item_id),
        );

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
              packing_status: "not_packed",
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
        setManualSearchItems([]);
        setTripLinks(sortTripLinksWithinGroups(nextTripLinks, nextLookCategories));
        setLookCategories(nextLookCategories);
        setWardrobeItems(nextWardrobeItems);
        setWardrobeItemLinks(nextWardrobeItemLinks);
        setTripItemReturns(nextTripItemReturns);
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

  useEffect(() => {
    let isActive = true;

    async function loadManualSearchItems() {
      if (!session) {
        return;
      }

      const trimmedQuery = manualAddQuery.trim();

      if (!trimmedQuery) {
        if (isActive) {
          setManualSearchItems([]);
          setIsManualSearchLoading(false);
        }
        return;
      }

      setIsManualSearchLoading(true);

      try {
        const nextItems = await searchInventoryItems(supabase, trimmedQuery);

        if (!isActive) {
          return;
        }

        setManualSearchItems(nextItems);
      } catch (error) {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to search wardrobe items.");
        }
      } finally {
        if (isActive) {
          setIsManualSearchLoading(false);
        }
      }
    }

    const timeoutId = window.setTimeout(() => {
      void loadManualSearchItems();
    }, 220);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [manualAddQuery, session, supabase]);

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
    const normalizedQuery = normalizeText(manualAddQuery);

    if (!normalizedQuery) {
      return [];
    }

    return manualSearchItems
      .filter((item) => {
        if (packedIds.has(item.item_id)) {
          return false;
        }

        if (!isInventoryItemAvailableForNewUse(item)) {
          return false;
        }

        return [item.item_id, item.item_name, item.category, item.colour]
          .filter(Boolean)
          .some((field) => normalizeText(field).includes(normalizedQuery));
      })
      .sort(
        (left, right) =>
          (left.item_name || left.item_id).localeCompare(right.item_name || right.item_id) ||
          left.item_id.localeCompare(right.item_id),
      );
  }, [manualAddQuery, manualSearchItems, wardrobeItems]);
  const essentialsByCategory = useMemo(() => {
    return tripEssentialItems.reduce<Record<string, TripEssentialItem[]>>((accumulator, item) => {
      const key = item.category || "Custom";
      accumulator[key] = accumulator[key] ? [...accumulator[key], item] : [item];
      return accumulator;
    }, {});
  }, [tripEssentialItems]);
  const checklistEssentialItems = useMemo(
    () =>
      tripEssentialItems.filter(
        (item) => item.packing_status !== "to_buy" && item.packing_status !== "not_required",
      ),
    [tripEssentialItems],
  );
  const toGetEssentialItems = useMemo(
    () => tripEssentialItems.filter((item) => item.packing_status === "to_buy"),
    [tripEssentialItems],
  );
  const activeEssentialItems = essentialsView === "to_get" ? toGetEssentialItems : checklistEssentialItems;
  const activeEssentialsByCategory = useMemo(() => {
    return activeEssentialItems.reduce<Record<string, TripEssentialItem[]>>((accumulator, item) => {
      const key = item.category || "Custom";
      accumulator[key] = accumulator[key] ? [...accumulator[key], item] : [item];
      return accumulator;
    }, {});
  }, [activeEssentialItems]);
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
  const visibleEssentialsCategoryProgress = useMemo(
    () =>
      Object.entries(activeEssentialsByCategory)
        .map(([category, items]) => {
          const packedItems = items.filter((item) => item.packing_status === "packed");

          return {
            category,
            items,
            packedCount: packedItems.length,
            totalCount: items.length,
          };
        })
        .sort(
          (left, right) =>
            ESSENTIAL_CATEGORY_OPTIONS.indexOf(left.category as (typeof ESSENTIAL_CATEGORY_OPTIONS)[number]) -
              ESSENTIAL_CATEGORY_OPTIONS.indexOf(right.category as (typeof ESSENTIAL_CATEGORY_OPTIONS)[number]) ||
            left.category.localeCompare(right.category),
        ),
    [activeEssentialsByCategory],
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
      availableWardrobeRows.filter((item) => item.packing_status === "unavailable").length +
      tripEssentialItems.filter((item) => item.packing_status === "unavailable").length;
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
  const incompleteLookCount = useMemo(
    () =>
      selectedOutfitEntries.filter(({ outfit }) =>
        outfit.item_ids.some((itemId) => {
          const matchingItem = wardrobeEntries.find((entry) => entry.row.wardrobe_item_id === itemId);
          return !matchingItem || ["unavailable", "waiting_for_laundry", "to_buy", "not_packed"].includes(matchingItem.row.packing_status);
        }),
      ).length,
    [selectedOutfitEntries, wardrobeEntries],
  );
  const capsuleItemCount = useMemo(
    () => wardrobeItems.filter((item) => item.capsule_status !== "excluded").length,
    [wardrobeItems],
  );
  const optionalCapsuleItemsCount = useMemo(
    () => wardrobeItems.filter((item) => item.capsule_status === "optional").length,
    [wardrobeItems],
  );
  const toBuyCapsuleItemsCount = useMemo(
    () => wardrobeItems.filter((item) => item.capsule_status === "to_buy" || item.source === "to_buy").length,
    [wardrobeItems],
  );
  const unresolvedWardrobeCount = useMemo(
    () =>
      wardrobeItems.filter((item) =>
        ["not_packed", "waiting_for_laundry", "to_buy", "unavailable"].includes(item.packing_status),
      ).length,
    [wardrobeItems],
  );
  const approvedCapsuleReady = useMemo(
    () => capsuleItemCount > 0 && selectedOutfitEntries.length > 0,
    [capsuleItemCount, selectedOutfitEntries.length],
  );
  const travelWardrobeEntries = useMemo(
    () =>
      wardrobeEntries.filter(({ row }) =>
        row.packing_status === "packed" || row.bag_assignment === "Wearing for travel",
      ),
    [wardrobeEntries],
  );
  const readyTravelLooks = useMemo(
    () =>
      selectedOutfitEntries.filter(({ outfit }) =>
        outfit.item_ids.every((itemId) => {
          const matchingItem = wardrobeEntries.find((entry) => entry.row.wardrobe_item_id === itemId);
          if (!matchingItem) {
            return false;
          }

          return (
            matchingItem.row.packing_status === "packed" ||
            matchingItem.row.bag_assignment === "Wearing for travel"
          );
        }),
      ),
    [selectedOutfitEntries, wardrobeEntries],
  );
  const partialTravelLooks = useMemo(
    () =>
      selectedOutfitEntries.filter(({ outfit }) =>
        outfit.item_ids.some((itemId) => {
          const matchingItem = wardrobeEntries.find((entry) => entry.row.wardrobe_item_id === itemId);
          return !matchingItem || !(matchingItem.row.packing_status === "packed" || matchingItem.row.bag_assignment === "Wearing for travel");
        }),
      ),
    [selectedOutfitEntries, wardrobeEntries],
  );
  const primaryTripAction = (() => {
    if (!trip) {
      return null;
    }

    switch (trip.status) {
      case "draft":
        return { label: "Review Capsule", action: () => setActiveTab("capsule") };
      case "ready_for_review":
        return { label: "Approve for Packing", action: () => void handleAdvanceTripStatus("approved_for_packing") };
      case "approved_for_packing":
      case "packing":
        return { label: "Continue Packing", action: () => setActiveTab("packing") };
      case "packed":
        return { label: "Open Travel Wardrobe", action: () => setActiveTab("travel_wardrobe") };
      case "travelling":
      case "unpacking":
        return { label: "Start Return Flow", action: () => setShowReturnFlow(true) };
      case "completed":
        return { label: "Open Travel Wardrobe", action: () => setActiveTab("travel_wardrobe") };
      default:
        return { label: "Review Capsule", action: () => setActiveTab("capsule") };
    }
  })();

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

      const derivedInventoryItems = await getInventoryItemsByItemIds(supabase, [...derivedMap.keys()]);
      const inventoryMap = new Map(
        derivedInventoryItems.map((item) => [item.item_id.trim().toUpperCase(), item]),
      );

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
            (inventoryItem && !isInventoryItemAvailableForNewUse(inventoryItem) ? "unavailable" : "not_packed"),
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
      const nextInventoryItems = await getInventoryItemsByItemIds(
        supabase,
        nextWardrobeItems.map((item) => item.wardrobe_item_id),
      );

      setWardrobeItems(nextWardrobeItems);
      setWardrobeItemLinks(nextWardrobeItemLinks);
      setInventoryItems(nextInventoryItems);
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
        packing_status: "not_packed",
        notes: null,
        sort_order: wardrobeItems.length,
      },
    ]);

    const [nextWardrobeItems, nextInventoryItems] = await Promise.all([
      getTripWardrobeItems(supabase, trip.id),
      getInventoryItemsByItemIds(supabase, [item.item_id]),
    ]);
    setWardrobeItems(nextWardrobeItems);
    setInventoryItems((current) => mergeInventoryCaches(current, nextInventoryItems));
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
    setInventoryItems((current) =>
      current.filter((inventoryItem) =>
        nextItems.some((packedItem) => packedItem.wardrobe_item_id === inventoryItem.item_id),
      ),
    );
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
        capsule_status: item.capsule_status,
        required: item.required,
        bag_assignment: item.bag_assignment,
        removed_from_capsule: item.removed_from_capsule,
        removed_from_capsule_at: item.removed_from_capsule_at,
        packed_at:
          nextStatus === "packed"
            ? item.packed_at ?? new Date().toISOString()
            : nextStatus === "not_packed"
              ? null
              : item.packed_at,
        notes: item.notes,
        sort_order: item.sort_order,
      },
    ]);

    const nextWardrobeItems = await getTripWardrobeItems(supabase, item.trip_id);
    setWardrobeItems(nextWardrobeItems);
  }

  async function handleUpdateWardrobeMeta(
    item: TripWardrobeItem,
    updates: Partial<
      Pick<
        TripWardrobeItem,
        | "capsule_status"
        | "required"
        | "bag_assignment"
        | "notes"
        | "packing_status"
        | "removed_from_capsule"
        | "removed_from_capsule_at"
      >
    >,
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
        packing_status: updates.packing_status ?? item.packing_status,
        capsule_status: updates.capsule_status ?? item.capsule_status,
        required: updates.required ?? item.required,
        bag_assignment: updates.bag_assignment ?? item.bag_assignment,
        removed_from_capsule: updates.removed_from_capsule ?? item.removed_from_capsule,
        removed_from_capsule_at:
          updates.removed_from_capsule_at === undefined
            ? item.removed_from_capsule_at
            : updates.removed_from_capsule_at,
        packed_at: item.packed_at,
        notes: updates.notes === undefined ? item.notes : updates.notes,
        sort_order: item.sort_order,
      },
    ]);

    const nextWardrobeItems = await getTripWardrobeItems(supabase, item.trip_id);
    setWardrobeItems(nextWardrobeItems);
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
    setOpenEssentialMenuId(null);
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

  async function handleAddInlineEssential(
    category: string,
    nextStatus: TripEssentialItem["packing_status"] = "not_packed",
  ) {
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
        packing_status: nextStatus,
        notes: newEssentialDraft.notes.trim() || null,
        sort_order: tripEssentialItems.length,
      },
    ]);

    setTripEssentialItems((current) => [...current, created]);
    setAddingCategory(null);
    setNewEssentialDraft(emptyEssentialDraft);
    setNotice(
      nextStatus === "to_buy"
        ? `${created.title} added to your To Get list.`
        : `${created.title} added to ${category}.`,
    );
  }

  async function handleResetChecklist() {
    const rowsToReset = tripEssentialItems.filter(
      (item) =>
        item.packing_status !== "to_buy" &&
        item.packing_status !== "not_required" &&
        item.packing_status !== "unavailable" &&
        item.packing_status !== "not_packed",
    );

    if (rowsToReset.length === 0) {
      return;
    }

    const updatedItems = await Promise.all(
      rowsToReset.map((item) =>
        updateTripEssentialItem(supabase, item.id, {
          packing_status: "not_packed",
        }),
      ),
    );

    const updatedMap = new Map(updatedItems.map((item) => [item.id, item]));
    setTripEssentialItems((current) =>
      current.map((item) => updatedMap.get(item.id) ?? item),
    );
    setNotice("Checklist reset.");
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

  async function handleAdvanceTripStatus(nextStatus: Trip["status"]) {
    if (!trip) {
      return;
    }

    const updated = await updateTrip(supabase, trip.id, {
      title: trip.title,
      destination: trip.destination ?? "",
      notes: trip.notes ?? "",
      start_date: trip.start_date ?? "",
      end_date: trip.end_date ?? "",
      baggage_limit: trip.baggage_limit ?? "",
      baggage_notes: trip.baggage_notes ?? "",
      luggage_type: trip.luggage_type ?? "",
      number_of_bags: trip.number_of_bags,
      weight_allowance: trip.weight_allowance ?? "",
      luggage_dimensions: trip.luggage_dimensions ?? "",
      luggage_assignment_notes: trip.luggage_assignment_notes ?? "",
      status: nextStatus,
    });

    setTrip(updated);
    if (nextStatus === "approved_for_packing") {
      await refreshTripPacking();
    }
    if (nextStatus === "packing") {
      setActiveTab("packing");
    }
    setNotice(`Trip status updated to ${formatTripStatus(updated.status)}.`);
  }

  async function handleUpdateReturnStatus(
    wardrobeItemId: string,
    returnStatus: TripItemReturn["return_status"],
  ) {
    if (!session || !trip) {
      return;
    }

    const updated = await upsertTripItemReturn(supabase, {
      trip_id: trip.id,
      wardrobe_item_id: wardrobeItemId,
      user_id: session.user.id,
      return_status: returnStatus,
    });

    setTripItemReturns((current) => {
      const next = current.filter((item) => item.wardrobe_item_id !== wardrobeItemId);
      return [...next, updated];
    });
  }

  async function handleCompleteTrip() {
    if (!trip || !session) {
      return;
    }

    setIsCompletingTrip(true);
    try {
      for (const item of travelWardrobeEntries) {
        const returnRecord =
          tripItemReturns.find((entry) => entry.wardrobe_item_id === item.row.wardrobe_item_id) ?? null;
        const nextReturnStatus = returnRecord?.return_status ?? "returned_to_wardrobe";

        const inventoryItem = item.inventoryItem;
        if (inventoryItem) {
          let nextInventoryStatus = inventoryItem.status ?? "Available";

          if (nextReturnStatus === "returned_to_wardrobe") nextInventoryStatus = "Available";
          if (nextReturnStatus === "in_laundry") nextInventoryStatus = "In Laundry";
          if (nextReturnStatus === "damaged") nextInventoryStatus = "Archived";
          if (nextReturnStatus === "lost" || nextReturnStatus === "discarded") nextInventoryStatus = "Discarded";
          if (nextReturnStatus === "still_packed") nextInventoryStatus = "Packed";

          if (inventoryItem.status !== nextInventoryStatus) {
            await updateInventoryItemStatus(supabase, inventoryItem.id, nextInventoryStatus);
          }
        }

        await handleUpdateReturnStatus(item.row.wardrobe_item_id, nextReturnStatus);
      }

      await handleAdvanceTripStatus("completed");
      setShowReturnFlow(false);
    } finally {
      setIsCompletingTrip(false);
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
      ["Luggage", trip.luggage_type ?? trip.baggage_limit ?? "Not yet added"],
      ["Allowance", trip.weight_allowance ?? trip.baggage_limit ?? "Not yet added"],
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
        .filter((entry) => entry.row.packing_status === "waiting_for_laundry" || entry.row.packing_status === "to_buy")
        .map((entry) => ({
          id: entry.row.id,
          label: entry.inventoryItem?.item_name || entry.row.wardrobe_item_id,
          meta: `Wardrobe • ${formatPackingStatusLabel(entry.row.packing_status)}`,
        })),
      ...tripEssentialItems
        .filter((item) => item.packing_status === "to_buy" || item.packing_status === "unavailable")
        .map((item) => ({
          id: item.id,
          label: item.title,
          meta: `Essential • ${formatPackingStatusLabel(item.packing_status)}`,
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
                  <div className="travel-inline-actions">
                    {primaryTripAction ? (
                      <button type="button" className="primary-button" onClick={primaryTripAction.action}>
                        {primaryTripAction.label}
                      </button>
                    ) : null}
                    <button type="button" className="ghost-button" onClick={() => setShowReturnFlow((current) => !current)}>
                      {showReturnFlow ? "Hide Return Flow" : "Start Return Flow"}
                    </button>
                  </div>
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
                  <p className="eyebrow">Capsule snapshot</p>
                  <div className="travel-quick-stats">
                    <TravelStatCard label="Capsule items" value={`${capsuleItemCount}`} />
                    <TravelStatCard label="Optional" value={`${optionalCapsuleItemsCount}`} />
                    <TravelStatCard label="To buy" value={`${toBuyCapsuleItemsCount}`} />
                    <TravelStatCard label="Looks selected" value={`${summaryStats.looksTotal}`} />
                  </div>
                </article>

                <article className="detail-card">
                  <p className="eyebrow">Luggage</p>
                  <DetailGrid
                    rows={[
                      ["Type", trip.luggage_type ?? "Not set"],
                      ["Bags", `${trip.number_of_bags}`],
                      ["Allowance", trip.weight_allowance ?? trip.baggage_limit ?? "Not set"],
                      ["Dimensions", trip.luggage_dimensions ?? "Not set"],
                    ]}
                  />
                  {trip.luggage_assignment_notes ? (
                    <p className="detail-description">{trip.luggage_assignment_notes}</p>
                  ) : null}
                </article>

                <article className="detail-card">
                  <p className="eyebrow">Readiness</p>
                  <div className="travel-count-list">
                    <div className="travel-count-row">
                      <span>Unique wardrobe items</span>
                      <strong>{capsuleItemCount}</strong>
                    </div>
                    <div className="travel-count-row">
                      <span>Incomplete looks</span>
                      <strong>{incompleteLookCount}</strong>
                    </div>
                    <div className="travel-count-row">
                      <span>Unresolved wardrobe items</span>
                      <strong>{unresolvedWardrobeCount}</strong>
                    </div>
                    <div className="travel-count-row">
                      <span>Capsule ready for review</span>
                      <strong>{approvedCapsuleReady ? "Yes" : "No"}</strong>
                    </div>
                  </div>
                </article>

                {showReturnFlow ? (
                  <article className="detail-card">
                    <p className="eyebrow">Return from trip</p>
                    <p className="detail-description">
                      Mark what happens to each trip wardrobe item before completing the trip.
                    </p>
                    <div className="travel-summary-look-list">
                      {travelWardrobeEntries.map(({ row, inventoryItem }) => {
                        const currentReturnStatus =
                          tripItemReturns.find((entry) => entry.wardrobe_item_id === row.wardrobe_item_id)?.return_status ??
                          "returned_to_wardrobe";

                        return (
                          <div className="travel-summary-look-row" key={row.id}>
                            <span>{inventoryItem?.item_name || row.wardrobe_item_id}</span>
                            <select
                              className="filter-select"
                              value={currentReturnStatus}
                              onChange={(event) =>
                                void handleUpdateReturnStatus(
                                  row.wardrobe_item_id,
                                  event.target.value as TripItemReturn["return_status"],
                                )
                              }
                            >
                              {[
                                "returned_to_wardrobe",
                                "in_laundry",
                                "damaged",
                                "lost",
                                "discarded",
                                "still_packed",
                              ].map((option) => (
                                <option key={option} value={option}>
                                  {formatTripReturnStatus(option as TripItemReturn["return_status"])}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => void handleCompleteTrip()}
                      disabled={isCompletingTrip}
                    >
                      {isCompletingTrip ? "Completing..." : "Complete Trip"}
                    </button>
                  </article>
                ) : null}
              </div>
            ) : null}

            {activeTab === "capsule" ? (
              <div className="dashboard dashboard-tight">
                <div className="travel-summary-grid">
                  <article className="detail-card travel-summary-card">
                    <strong>{capsuleItemCount}</strong>
                    <span>Unique capsule items</span>
                  </article>
                  <article className="detail-card travel-summary-card">
                    <strong>{optionalCapsuleItemsCount}</strong>
                    <span>Optional items</span>
                  </article>
                  <article className="detail-card travel-summary-card">
                    <strong>{toBuyCapsuleItemsCount}</strong>
                    <span>Marked to buy</span>
                  </article>
                  <article className="detail-card travel-summary-card">
                    <strong>{incompleteLookCount}</strong>
                    <span>Incomplete looks</span>
                  </article>
                </div>

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

                  <article className="detail-card travel-capsule-picker-card">
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

                    <div className="travel-lookbook-grid travel-capsule-picker-grid">
                      {filteredOutfits.map((outfit) => {
                        const isSelected = selectedOutfitIds.has(outfit.id);
                        const imageUrl = getOutfitDisplayImage(outfit);

                        return (
                          <button
                            key={outfit.id}
                            type="button"
                            className={`travel-lookbook-card travel-capsule-picker-lookbook-card ${isSelected ? "is-selected" : ""}`}
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

                <div className="travel-shell-grid packing-shell-grid">
                  <article className="detail-card">
                    <div className="results-bar">
                      <div className="results-copy">
                        <p className="results-heading">Capsule items</p>
                        <p>Every trip wardrobe piece lives here first. Packing is generated from this capsule.</p>
                      </div>
                      {trip.status === "draft" ? (
                        <button
                          type="button"
                          className="primary-button"
                          onClick={() => void handleAdvanceTripStatus("ready_for_review")}
                          disabled={!approvedCapsuleReady}
                        >
                          Mark ready for review
                        </button>
                      ) : null}
                    </div>

                    {wardrobeEntries.length === 0 ? (
                      <EmptyState
                        compact
                        title="No capsule items yet"
                        description="Add lookbooks or search the wardrobe below to start building this trip capsule."
                      />
                    ) : (
                      <div className="inventory-grid">
                        {wardrobeEntries.map(({ row, inventoryItem, usedInOutfits, isUnavailable }) => {
                          const imageUrl = inventoryItem ? getDisplayImage(inventoryItem.image) : null;

                          return (
                            <article
                              className={`inventory-card travel-packing-card ${isUnavailable ? "is-unavailable" : ""}`}
                              key={row.id}
                            >
                              <div className="card-image-wrap">
                                {imageUrl ? (
                                  <TravelPackingImage
                                    src={imageUrl}
                                    alt={inventoryItem?.item_name || row.wardrobe_item_id}
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
                                    <span>{row.source === "manual" ? "Manual" : "From look"}</span>
                                  </div>
                                </div>

                                <div className="travel-item-status-row">
                                  <span className={`trip-status-pill status-${row.capsule_status}`}>
                                    {formatTripCapsuleStatus(row.capsule_status)}
                                  </span>
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

                                <div className="travel-shell-grid">
                                  <label className="field">
                                    <span>Capsule status</span>
                                    <select
                                      className="filter-select"
                                      value={row.capsule_status}
                                      onChange={(event) =>
                                        void handleUpdateWardrobeMeta(row, {
                                          capsule_status: event.target.value as TripWardrobeItem["capsule_status"],
                                        })
                                      }
                                    >
                                      {(["confirmed", "optional", "to_buy", "excluded"] as const).map((status) => (
                                        <option key={status} value={status}>
                                          {formatTripCapsuleStatus(status)}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="field">
                                    <span>Bag assignment</span>
                                    <select
                                      className="filter-select"
                                      value={row.bag_assignment ?? "Unassigned"}
                                      onChange={(event) =>
                                        void handleUpdateWardrobeMeta(row, {
                                          bag_assignment: event.target.value as TripWardrobeItem["bag_assignment"],
                                        })
                                      }
                                    >
                                      {(["Unassigned", "Checked suitcase", "Cabin bag", "Personal item", "Wearing for travel"] as const).map(
                                        (assignment) => (
                                          <option key={assignment} value={assignment}>
                                            {assignment}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  </label>
                                </div>

                                {isUnavailable ? (
                                  <p className="linked-item-warning">
                                    This item is unavailable and will be flagged during review and packing.
                                  </p>
                                ) : null}

                                <div className="inventory-card-actions">
                                  <button
                                    type="button"
                                    className={`ghost-button studio-mini-button ${row.required ? "is-active" : ""}`}
                                    onClick={() =>
                                      void handleUpdateWardrobeMeta(row, {
                                        required: !row.required,
                                      })
                                    }
                                  >
                                    {row.required ? "Required" : "Optional"}
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost-button studio-mini-button danger-button"
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
                  </article>

                  <article className="detail-card">
                    <div className="results-bar">
                      <div className="results-copy">
                        <p className="results-heading">Add wardrobe items</p>
                        <p>Search first to keep Travel light and avoid loading the whole wardrobe at once.</p>
                      </div>
                    </div>

                    <div className="search-panel search-panel-compact">
                      <label className="search-label" htmlFor="trip-manual-add-search">
                        Search wardrobe for manual adds
                      </label>
                      <input
                        id="trip-manual-add-search"
                        className="search-input"
                        type="search"
                        value={manualAddQuery}
                        placeholder="Search by item, ID, category, or colour"
                        onChange={(event) => setManualAddQuery(event.target.value)}
                      />
                    </div>

                    {!manualAddQuery.trim() ? (
                      <EmptyState
                        compact
                        title="Search to add a wardrobe piece"
                        description="Type an item name, ID, category, or colour to find extra pieces for this trip capsule."
                      />
                    ) : isManualSearchLoading ? (
                      <EmptyState
                        compact
                        title="Searching wardrobe"
                        description="Finding matching wardrobe pieces for this trip capsule."
                      />
                    ) : manualInventoryOptions.length === 0 ? (
                      <EmptyState
                        compact
                        title="No extra wardrobe pieces found"
                        description="Try another search term to load different wardrobe pieces."
                      />
                    ) : (
                      <>
                        <div className="results-copy travel-manual-summary">
                          <p>
                            {manualInventoryOptions.length} available piece{manualInventoryOptions.length === 1 ? "" : "s"}
                          </p>
                        </div>

                        <div className="travel-manual-scroll">
                          <div className="travel-manual-grid">
                            {manualInventoryOptions.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className="travel-manual-card"
                                onClick={() => void handleAddManualItem(item)}
                              >
                                <div className="travel-manual-card-media">
                                  {getDisplayImage(item.image) ? (
                                    <RemoteImage
                                      src={getDisplayImage(item.image)!}
                                      alt={item.item_name || item.item_id}
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
                                <span className="trip-meta-pill">Add to capsule</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </article>
                </div>
              </div>
            ) : null}

            {activeTab === "packing" ? (
              <div className="dashboard dashboard-tight">
                <div className="results-bar inventory-overview">
                  <div className="results-copy">
                    <p className="results-heading">Wardrobe packing</p>
                    <p>Packing is generated from your capsule. Add or remove items in Capsule, then return here to track what is physically packed.</p>
                  </div>
                  <div className="travel-inline-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => setActiveTab("capsule")}
                    >
                      Add to capsule
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => void refreshTripPacking()}
                      disabled={isSyncing}
                    >
                      {isSyncing ? "Refreshing..." : "Refresh packing"}
                    </button>
                  </div>
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
                              <TravelPackingImage
                                src={imageUrl}
                                alt={inventoryItem?.item_name || row.wardrobe_item_id}
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
                              {(["not_packed", "packed", "not_required", "waiting_for_laundry", "to_buy", "unavailable"] as const).map((status) => (
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
                                    <TravelPackingImage
                                      src={imageUrl}
                                      alt={inventoryItem?.item_name || row.wardrobe_item_id}
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
                  <p className="eyebrow">Packing workflow</p>
                  <p className="detail-description">
                    Need another item? Add it in Capsule so packing stays in sync with the trip plan.
                  </p>
                  <button type="button" className="ghost-button" onClick={() => setActiveTab("capsule")}>
                    Open capsule
                  </button>
                </article>
              </div>
            ) : null}

            {activeTab === "essentials" ? (
              <div className="dashboard dashboard-tight">
                <div className="results-bar inventory-overview">
                  <div className="results-copy">
                    <p className="results-heading">Trip essentials</p>
                    <p>Your trip checklist and shopping list live here.</p>
                  </div>
                </div>

                <div className="trip-essentials-viewbar">
                  <button
                    type="button"
                    className={`trip-essentials-viewchip ${essentialsView === "checklist" ? "is-active" : ""}`}
                    onClick={() => setEssentialsView("checklist")}
                  >
                    Checklist
                  </button>
                  <button
                    type="button"
                    className={`trip-essentials-viewchip ${essentialsView === "to_get" ? "is-active" : ""}`}
                    onClick={() => setEssentialsView("to_get")}
                  >
                    To Get
                    {toGetEssentialItems.length > 0 ? (
                      <span className="trip-essentials-viewcount">{toGetEssentialItems.length}</span>
                    ) : null}
                  </button>
                </div>

                {visibleEssentialsCategoryProgress.length === 0 ? (
                  <EmptyState
                    compact
                    title={
                      essentialsView === "to_get"
                        ? "Nothing on your To Get list"
                        : "No checklist items for this trip yet"
                    }
                    description={
                      essentialsView === "to_get"
                        ? "Mark checklist items as To Get or add new shopping items here."
                        : "Add essentials to start building this trip checklist."
                    }
                  />
                ) : (
                  <div className="trip-essentials-groups">
                    {visibleEssentialsCategoryProgress.map(({ category, items, packedCount, totalCount }) => {
                        const isCollapsed = collapsedCategories[category] ?? false;
                        const addKey = `${essentialsView}:${category}`;

                        return (
                          <section className="trip-essentials-category-card" key={category}>
                            <div className="trip-essentials-category-head">
                              <div className="trip-essentials-category-copy">
                                <h3>{category}</h3>
                              </div>
                              <div className="trip-essentials-category-actions">
                                <span className="trip-essentials-category-count">
                                  {essentialsView === "to_get" ? totalCount : `${packedCount}/${totalCount}`}
                                </span>
                                <button
                                  type="button"
                                  className="trip-essentials-icon-button"
                                  onClick={() =>
                                    setAddingCategory((current) => (current === addKey ? null : addKey))
                                  }
                                >
                                  +
                                </button>
                                <button
                                  type="button"
                                  className="trip-essentials-icon-button"
                                  onClick={() =>
                                    setCollapsedCategories((current) => ({
                                      ...current,
                                      [category]: !isCollapsed,
                                    }))
                                  }
                                >
                                  {isCollapsed ? "+" : "−"}
                                </button>
                              </div>
                            </div>

                            {addingCategory === addKey ? (
                              <div className="trip-essentials-addrow">
                                <input
                                  className="trip-essentials-addinput"
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
                                  <button
                                    type="button"
                                    className="trip-essentials-inline-button is-primary"
                                    onClick={() =>
                                      void handleAddInlineEssential(
                                        category,
                                        essentialsView === "to_get" ? "to_buy" : "not_packed",
                                      )
                                    }
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    className="trip-essentials-inline-button"
                                    onClick={() => {
                                      setAddingCategory(null);
                                      setNewEssentialDraft(emptyEssentialDraft);
                                    }}
                                  >
                                    Cancel
                                  </button>
                              </div>
                            ) : null}

                            {!isCollapsed ? (
                              <div className="trip-essentials-list">
                                {items.map((item) => {
                                  const isEditing = editingEssentialId === item.id;

                                  return (
                                    <article
                                      className={`trip-essentials-row status-${item.packing_status}`}
                                      key={item.id}
                                      draggable
                                      onDragStart={() => setDraggedEssentialId(item.id)}
                                      onDragOver={(event) => event.preventDefault()}
                                      onDrop={() => void handleReorderEssentials(item.id)}
                                    >
                                      <div className="trip-essentials-row-main">
                                        {essentialsView === "checklist" ? (
                                          <button
                                            type="button"
                                            className={`trip-essentials-check ${item.packing_status === "packed" ? "is-checked" : ""}`}
                                            onClick={() =>
                                              void handleUpdateEssentialStatus(
                                                item,
                                                item.packing_status === "packed" ? "not_packed" : "packed",
                                              )
                                            }
                                            aria-label={
                                              item.packing_status === "packed"
                                                ? `Mark ${item.title} not packed`
                                                : `Mark ${item.title} packed`
                                            }
                                          >
                                            <span />
                                          </button>
                                        ) : (
                                          <span className="trip-essentials-shopping-dot" aria-hidden="true" />
                                        )}

                                        <div className="trip-essentials-row-copy">
                                          <div>
                                            {isEditing ? (
                                              <input
                                                className="trip-essentials-edit-input"
                                                value={editingEssentialDraft.title}
                                                onChange={(event) =>
                                                  setEditingEssentialDraft((current) => ({
                                                    ...current,
                                                    title: event.target.value,
                                                  }))
                                                }
                                              />
                                            ) : (
                                              <strong>{item.title}</strong>
                                            )}
                                          </div>
                                        {isEditing ? (
                                          <textarea
                                            className="trip-essentials-edit-notes"
                                            value={editingEssentialDraft.notes}
                                            onChange={(event) =>
                                              setEditingEssentialDraft((current) => ({
                                                ...current,
                                                notes: event.target.value,
                                              }))
                                            }
                                          />
                                          ) : item.notes ? (
                                          <small>{item.notes}</small>
                                        ) : null}
                                        </div>
                                      </div>

                                      <div className="trip-essentials-row-actions">
                                        {isEditing ? (
                                          <>
                                            <button
                                              type="button"
                                              className="trip-essentials-inline-button is-primary"
                                              onClick={() => void handleSaveEditedEssential(item)}
                                            >
                                              Save
                                            </button>
                                            <button
                                              type="button"
                                              className="trip-essentials-inline-button"
                                              onClick={() => {
                                                setEditingEssentialId(null);
                                                setEditingEssentialDraft(emptyEssentialDraft);
                                              }}
                                            >
                                              Cancel
                                            </button>
                                          </>
                                        ) : (
                                          <div className="trip-essentials-menu-wrap">
                                            <button
                                              type="button"
                                              className="trip-essentials-menu-button"
                                              onClick={() =>
                                                setOpenEssentialMenuId((current) =>
                                                  current === item.id ? null : item.id,
                                                )
                                              }
                                            >
                                              ···
                                            </button>

                                            {openEssentialMenuId === item.id ? (
                                              <div className="trip-essentials-menu">
                                                {essentialsView === "to_get" ? (
                                                  <button
                                                    type="button"
                                                    className="trip-essentials-menu-item"
                                                    onClick={() => void handleUpdateEssentialStatus(item, "not_packed")}
                                                  >
                                                    Mark purchased
                                                  </button>
                                                ) : (
                                                  <>
                                                    <button
                                                      type="button"
                                                      className="trip-essentials-menu-item"
                                                      onClick={() => void handleUpdateEssentialStatus(item, "to_buy")}
                                                    >
                                                      Mark To Get
                                                    </button>
                                                    <button
                                                      type="button"
                                                      className="trip-essentials-menu-item"
                                                      onClick={() =>
                                                        void handleUpdateEssentialStatus(
                                                          item,
                                                          item.packing_status === "packed" ? "not_packed" : "packed",
                                                        )
                                                      }
                                                    >
                                                      {item.packing_status === "packed" ? "Mark not packed" : "Mark packed"}
                                                    </button>
                                                  </>
                                                )}
                                                <button
                                                  type="button"
                                                  className="trip-essentials-menu-item"
                                                  onClick={() => {
                                                    setEditingEssentialId(item.id);
                                                    setEditingEssentialDraft({
                                                      title: item.title,
                                                      notes: item.notes ?? "",
                                                    });
                                                    setOpenEssentialMenuId(null);
                                                  }}
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  type="button"
                                                  className="trip-essentials-menu-item danger"
                                                  onClick={() => void handleDeleteEssential(item)}
                                                >
                                                  Delete
                                                </button>
                                              </div>
                                            ) : null}
                                          </div>
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

                {essentialsView === "checklist" ? (
                  <button
                    type="button"
                    className="trip-essentials-reset"
                    onClick={() => void handleResetChecklist()}
                  >
                    Reset all checks
                  </button>
                ) : null}
              </div>
            ) : null}

            {activeTab === "packed_summary" ? (
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
                        {selectedOutfitEntries.length === 0 ? (
                          <div className="travel-summary-look-row">
                            <span>No looks selected yet</span>
                            <strong>0</strong>
                          </div>
                        ) : (
                          selectedOutfitEntries.map(({ outfit }) => {
                            const packedCount = outfit.item_ids.filter((itemId) => {
                              const matchingItem = wardrobeEntries.find((entry) => entry.row.wardrobe_item_id === itemId);
                              return (
                                matchingItem &&
                                (matchingItem.row.packing_status === "packed" ||
                                  matchingItem.row.bag_assignment === "Wearing for travel")
                              );
                            }).length;
                            const requiredCount = outfit.item_ids.length;

                            let stateLabel = "Ready";
                            if (packedCount === 0) stateLabel = "Incomplete";
                            else if (packedCount < requiredCount) stateLabel = "Almost ready";

                            return (
                              <div className="travel-summary-look-row" key={outfit.id}>
                                <span>{outfit.title}</span>
                                <strong>
                                  {stateLabel} • {packedCount}/{requiredCount}
                                </strong>
                              </div>
                            );
                          })
                        )}
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

            {activeTab === "travel_wardrobe" ? (
              <div className="dashboard dashboard-tight">
                <div className="results-bar inventory-overview">
                  <div className="results-copy">
                    <p className="results-heading">Travel wardrobe</p>
                    <p>Only pieces physically available on the trip appear here, so you can style from what is actually with you.</p>
                  </div>
                  <div className="travel-inline-actions">
                    <button type="button" className="ghost-button" onClick={() => setActiveTab("packing")}>
                      Open packing
                    </button>
                    <button type="button" className="ghost-button" onClick={() => setShowReturnFlow(true)}>
                      Start return flow
                    </button>
                  </div>
                </div>

                <div className="travel-summary-grid">
                  <article className="detail-card travel-summary-card">
                    <strong>{travelWardrobeEntries.length}</strong>
                    <span>Available on trip</span>
                  </article>
                  <article className="detail-card travel-summary-card">
                    <strong>{readyTravelLooks.length}</strong>
                    <span>Ready looks</span>
                  </article>
                  <article className="detail-card travel-summary-card">
                    <strong>{partialTravelLooks.length}</strong>
                    <span>Partial looks</span>
                  </article>
                </div>

                {travelWardrobeEntries.length === 0 ? (
                  <EmptyState
                    compact
                    title="No travel wardrobe available yet"
                    description="Pack wardrobe pieces or mark them as wearing for travel to build the trip wardrobe."
                  />
                ) : (
                  <div className="inventory-grid">
                    {travelWardrobeEntries.map(({ row, inventoryItem, usedInOutfits }) => {
                      const imageUrl = inventoryItem ? getDisplayImage(inventoryItem.image) : null;

                      return (
                        <article className="inventory-card travel-packing-card" key={row.id}>
                          <div className="card-image-wrap">
                            {imageUrl ? (
                              <TravelPackingImage
                                src={imageUrl}
                                alt={inventoryItem?.item_name || row.wardrobe_item_id}
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
                                <span>{row.bag_assignment}</span>
                              </div>
                            </div>

                            <div className="travel-item-status-row">
                              <span className={`trip-status-pill status-${row.packing_status}`}>
                                {formatPackingStatusLabel(row.packing_status)}
                              </span>
                            </div>

                            <div className="travel-used-in">
                              <span className="travel-used-in-label">Ready with:</span>
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
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                <div className="travel-shell-grid">
                  <article className="detail-card">
                    <p className="eyebrow">Ready looks</p>
                    <div className="travel-summary-look-list">
                      {readyTravelLooks.length === 0 ? (
                        <div className="travel-summary-look-row">
                          <span>No fully ready looks yet</span>
                          <strong>0</strong>
                        </div>
                      ) : (
                        readyTravelLooks.map(({ outfit }) => (
                          <div className="travel-summary-look-row" key={outfit.id}>
                            <span>{outfit.title}</span>
                            <strong>{outfit.item_ids.length} items ready</strong>
                          </div>
                        ))
                      )}
                    </div>
                  </article>

                  <article className="detail-card">
                    <p className="eyebrow">Partial looks</p>
                    <div className="travel-summary-look-list">
                      {partialTravelLooks.length === 0 ? (
                        <div className="travel-summary-look-row">
                          <span>Every selected look is currently ready</span>
                          <strong>0</strong>
                        </div>
                      ) : (
                        partialTravelLooks.map(({ outfit }) => (
                          <div className="travel-summary-look-row" key={outfit.id}>
                            <span>{outfit.title}</span>
                            <strong>Needs review</strong>
                          </div>
                        ))
                      )}
                    </div>
                  </article>
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

function TravelPackingImage({ src, alt }: { src: string; alt: string }) {
  const [didFail, setDidFail] = useState(false);

  if (didFail) {
    return <div className="card-image-fallback">No image available</div>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="card-image"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setDidFail(true)}
    />
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
