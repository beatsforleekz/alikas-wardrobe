import type {
  WishlistEntryType,
  WishlistItem,
  WishlistItemInput,
  WishlistItemOutfitLink,
  WishlistItemTripLink,
  WishlistStatus,
} from "@/types/wishlist";

type WishlistItemRow = {
  id: string;
  user_id: string | null;
  entry_type: string | null;
  item_name: string | null;
  category: string | null;
  colour_material: string | null;
  reason: string | null;
  priority_rating: number | null;
  status: string | null;
  estimated_outfits_improved: number | null;
  notes: string | null;
  link_url: string | null;
  image_url: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type WishlistItemOutfitLinkRow = {
  id: string;
  wishlist_item_id: string;
  outfit_id: string;
  user_id: string | null;
  created_at: string | null;
};

type WishlistItemTripLinkRow = {
  id: string;
  wishlist_item_id: string;
  trip_id: string;
  user_id: string | null;
  created_at: string | null;
};

export const WISHLIST_ENTRY_TYPE_OPTIONS: WishlistEntryType[] = [
  "gap_analysis",
  "wishlist",
] as const;

export const WISHLIST_STATUS_OPTIONS: WishlistStatus[] = [
  "bought",
  "idea",
  "skipped",
  "to_buy",
] as const;

export const EMPTY_WISHLIST_ITEM_INPUT: WishlistItemInput = {
  entry_type: "wishlist",
  item_name: "",
  category: "",
  colour_material: "",
  reason: "",
  priority_rating: 3,
  status: "idea",
  estimated_outfits_improved: 0,
  notes: "",
  link_url: "",
  image_url: "",
  related_outfit_ids: [],
  related_trip_ids: [],
};

export function normalizeWishlistItemRecord(row: WishlistItemRow): WishlistItem {
  return {
    id: row.id,
    user_id: row.user_id,
    entry_type: normalizeEntryType(row.entry_type),
    item_name: row.item_name?.trim() || "Untitled wishlist item",
    category: nullableValue(row.category),
    colour_material: nullableValue(row.colour_material),
    reason: nullableValue(row.reason),
    priority_rating: normalizePriority(row.priority_rating),
    status: normalizeStatus(row.status),
    estimated_outfits_improved: Math.max(0, row.estimated_outfits_improved ?? 0),
    notes: nullableValue(row.notes),
    link_url: nullableValue(row.link_url),
    image_url: nullableValue(row.image_url),
    sort_order: row.sort_order ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeWishlistItemOutfitLinkRecord(
  row: WishlistItemOutfitLinkRow,
): WishlistItemOutfitLink {
  return {
    id: row.id,
    wishlist_item_id: row.wishlist_item_id,
    outfit_id: row.outfit_id,
    user_id: row.user_id,
    created_at: row.created_at,
  };
}

export function normalizeWishlistItemTripLinkRecord(
  row: WishlistItemTripLinkRow,
): WishlistItemTripLink {
  return {
    id: row.id,
    wishlist_item_id: row.wishlist_item_id,
    trip_id: row.trip_id,
    user_id: row.user_id,
    created_at: row.created_at,
  };
}

export function sanitizeWishlistItemInput(input: WishlistItemInput) {
  return {
    entry_type: normalizeEntryType(input.entry_type),
    item_name: input.item_name.trim(),
    category: nullableValue(input.category),
    colour_material: nullableValue(input.colour_material),
    reason: nullableValue(input.reason),
    priority_rating: clampPriority(input.priority_rating),
    status: normalizeStatus(input.status),
    estimated_outfits_improved: Math.max(0, Number(input.estimated_outfits_improved) || 0),
    notes: nullableValue(input.notes),
    link_url: nullableUrl(input.link_url),
    image_url: nullableUrl(input.image_url),
  };
}

export function formatWishlistStatus(status: WishlistStatus) {
  return status === "to_buy" ? "To Buy" : status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatWishlistEntryType(entryType: WishlistEntryType) {
  return entryType === "gap_analysis" ? "Gap Analysis" : "Wishlist";
}

export function getWishlistPriorityLabel(priority: number) {
  return `Priority ${clampPriority(priority)}`;
}

export function validateWishlistItemInput(input: WishlistItemInput) {
  const errors: string[] = [];

  if (!input.item_name.trim()) {
    errors.push("Add an item name before saving.");
  }

  if (!Number.isFinite(input.priority_rating) || input.priority_rating < 1 || input.priority_rating > 5) {
    errors.push("Priority rating must be between 1 and 5.");
  }

  if ((input.link_url.trim() && !isLikelyUrl(input.link_url)) || (input.image_url.trim() && !isLikelyUrl(input.image_url))) {
    if (input.link_url.trim() && !isLikelyUrl(input.link_url)) {
      errors.push("Reference link must be a valid URL.");
    }

    if (input.image_url.trim() && !isLikelyUrl(input.image_url)) {
      errors.push("Image URL must be a valid URL.");
    }
  }

  return errors;
}

function normalizeEntryType(value: string | null | undefined): WishlistEntryType {
  return value === "gap_analysis" ? "gap_analysis" : "wishlist";
}

function normalizeStatus(value: string | null | undefined): WishlistStatus {
  if (value === "to_buy" || value === "bought" || value === "skipped") {
    return value;
  }

  return "idea";
}

function clampPriority(value: number) {
  const safeValue = Number(value) || 3;
  return Math.min(5, Math.max(1, Math.round(safeValue)));
}

function normalizePriority(value: number | null | undefined) {
  return clampPriority(value ?? 3);
}

function nullableValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function nullableUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && isLikelyUrl(trimmed) ? trimmed : null;
}

function isLikelyUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}
