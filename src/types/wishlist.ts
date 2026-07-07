export type WishlistEntryType = "wishlist" | "gap_analysis";

export type WishlistStatus = "idea" | "to_buy" | "bought" | "skipped";

export type WishlistItem = {
  id: string;
  user_id: string | null;
  entry_type: WishlistEntryType;
  item_name: string;
  category: string | null;
  colour_material: string | null;
  reason: string | null;
  priority_rating: number;
  status: WishlistStatus;
  estimated_outfits_improved: number;
  notes: string | null;
  link_url: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type WishlistItemInput = {
  entry_type: WishlistEntryType;
  item_name: string;
  category: string;
  colour_material: string;
  reason: string;
  priority_rating: number;
  status: WishlistStatus;
  estimated_outfits_improved: number;
  notes: string;
  link_url: string;
  image_url: string;
  related_outfit_ids: string[];
  related_trip_ids: string[];
};

export type WishlistItemOutfitLink = {
  id: string;
  wishlist_item_id: string;
  outfit_id: string;
  user_id: string | null;
  created_at: string | null;
};

export type WishlistItemTripLink = {
  id: string;
  wishlist_item_id: string;
  trip_id: string;
  user_id: string | null;
  created_at: string | null;
};
