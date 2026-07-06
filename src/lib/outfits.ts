import type { InventoryItem } from "@/types/inventory";
import type { Outfit, OutfitLinkedItem, ValidatedOutfit } from "@/types/outfit";

type OutfitRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  item_ids: unknown;
  notes: string | null;
  created_at: string | null;
  tags: string | null;
  occasion: string | null;
  lookbook_urls: unknown;
};

const outfitGroups = [
  "Dress / One Piece",
  "Top",
  "Bottom / Skirt / Shorts",
  "Swimwear",
  "Cover Up",
  "Shoes",
  "Bag",
  "Hat",
  "Hair",
  "Accessories",
] as const;

export function normalizeOutfitRecord(row: OutfitRow): Outfit {
  const tags = parseTagString(row.tags);

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.name?.trim() || "Untitled outfit",
    notes: row.notes,
    created_at: row.created_at,
    occasion: row.occasion?.trim() || null,
    tags,
    capsule: tags.length ? tags.join(" • ") : null,
    item_ids: parseStringArray(row.item_ids),
    lookbook_urls: parseStringArray(row.lookbook_urls),
  };
}

export function validateOutfit(outfit: Outfit, inventoryItems: InventoryItem[]): ValidatedOutfit {
  const inventoryMap = new Map(inventoryItems.map((item) => [item.item_id, item]));
  const duplicateCounts = new Map<string, number>();

  outfit.item_ids.forEach((itemId) => {
    duplicateCounts.set(itemId, (duplicateCounts.get(itemId) ?? 0) + 1);
  });

  const linkedItems = outfit.item_ids.map((itemId) =>
    buildLinkedItem(itemId, inventoryMap.get(itemId) ?? null, duplicateCounts.get(itemId) ?? 0),
  );

  return {
    outfit,
    linkedItems,
    linkedItemCount: linkedItems.length,
    missingItemCount: linkedItems.filter((item) => item.status === "missing_item").length,
    needsReviewCount: linkedItems.filter((item) => item.status === "needs_review").length,
  };
}

export function groupOutfitItems(items: OutfitLinkedItem[]) {
  return outfitGroups
    .map((groupLabel) => ({
      groupLabel,
      items: items.filter((item) => item.groupLabel === groupLabel),
    }))
    .filter((group) => group.items.length > 0);
}

export function getOutfitDisplayImage(outfit: Outfit) {
  return outfit.lookbook_urls[0] ?? null;
}

function buildLinkedItem(
  itemId: string,
  inventoryItem: InventoryItem | null,
  duplicateCount: number,
): OutfitLinkedItem {
  if (!inventoryItem) {
    return {
      itemId,
      status: "missing_item",
      inventoryItem: null,
      categoryLabel: "Missing item",
      groupLabel: "Accessories",
      notes: "This item ID does not currently exist in the wardrobe inventory.",
    };
  }

  if (duplicateCount > 1) {
    return {
      itemId,
      status: "needs_review",
      inventoryItem,
      categoryLabel: inventoryItem.category?.trim() || "Uncategorised",
      groupLabel: getOutfitGroupLabel(inventoryItem),
      notes: "This item ID is linked more than once in the same outfit and should be reviewed.",
    };
  }

  return {
    itemId,
    status: "confirmed",
    inventoryItem,
    categoryLabel: inventoryItem.category?.trim() || "Uncategorised",
    groupLabel: getOutfitGroupLabel(inventoryItem),
    notes: null,
  };
}

function getOutfitGroupLabel(item: InventoryItem) {
  const itemId = item.item_id.trim().toUpperCase();
  const category = item.category?.trim().toLowerCase() || "";

  if (itemId === "TOP_051") {
    return "Cover Up";
  }

  if (itemId === "COVERUP_001") {
    return "Bottom / Skirt / Shorts";
  }

  if (["dress", "set", "swim set"].includes(category)) {
    return "Dress / One Piece";
  }

  if (["top", "bodysuit", "outerwear"].includes(category)) {
    return "Top";
  }

  if (["bottoms", "bottom", "skirt", "shorts"].includes(category)) {
    return "Bottom / Skirt / Shorts";
  }

  if (["swimwear"].includes(category)) {
    return "Swimwear";
  }

  if (["cover up"].includes(category)) {
    return "Cover Up";
  }

  if (["shoes"].includes(category)) {
    return "Shoes";
  }

  if (["bag"].includes(category)) {
    return "Bag";
  }

  if (["hats", "hat"].includes(category)) {
    return "Hat";
  }

  if (["hair"].includes(category)) {
    return "Hair";
  }

  return "Accessories";
}

function parseTagString(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => `${entry}`.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => `${entry}`.trim()).filter(Boolean);
      }
    } catch {
      return trimmed
        .split(",")
        .map((entry) => entry.replace(/[[\]"]/g, "").trim())
        .filter(Boolean);
    }
  }

  return [];
}
