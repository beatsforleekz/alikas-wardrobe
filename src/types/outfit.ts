import type { InventoryItem } from "@/types/inventory";

export type Outfit = {
  id: string;
  user_id: string | null;
  title: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  occasion: string | null;
  tags: string[];
  capsule: string | null;
  trip: string | null;
  item_ids: string[];
  lookbook_urls: string[];
};

export type OutfitInput = {
  title: string;
  occasion: string;
  trip: string;
  coverImage: string;
  notes: string;
  tags: string;
  item_ids: string[];
};

export type OutfitItemValidationStatus =
  | "confirmed"
  | "needs_review"
  | "missing_item"
  | "unavailable_item";

export type OutfitLinkedItem = {
  itemId: string;
  status: OutfitItemValidationStatus;
  inventoryItem: InventoryItem | null;
  categoryLabel: string;
  groupLabel: string;
  notes: string | null;
  availabilityStatus: string | null;
};

export type ValidatedOutfit = {
  outfit: Outfit;
  linkedItems: OutfitLinkedItem[];
  linkedItemCount: number;
  missingItemCount: number;
  needsReviewCount: number;
  unavailableItemCount: number;
};

export type LookbookPromptResult = {
  canGenerate: boolean;
  prompt: string;
  reason: string | null;
};
