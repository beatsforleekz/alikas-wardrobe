import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeWishlistItemOutfitLinkRecord,
  normalizeWishlistItemRecord,
  normalizeWishlistItemTripLinkRecord,
  sanitizeWishlistItemInput,
} from "@/lib/wishlist";
import type {
  WishlistItem,
  WishlistItemInput,
  WishlistItemOutfitLink,
  WishlistItemTripLink,
} from "@/types/wishlist";

type WishlistItemRow = WishlistItem;
type WishlistItemOutfitLinkRow = WishlistItemOutfitLink;
type WishlistItemTripLinkRow = WishlistItemTripLink;

export async function getWishlistItems(supabase: SupabaseClient): Promise<WishlistItem[]> {
  const { data, error } = await supabase
    .from("wishlist_items")
    .select("*")
    .order("priority_rating", { ascending: false })
    .order("estimated_outfits_improved", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load wishlist: ${error.message}`);
  }

  return ((data as WishlistItemRow[] | null) ?? []).map(normalizeWishlistItemRecord);
}

export async function getWishlistItemOutfitLinks(
  supabase: SupabaseClient,
): Promise<WishlistItemOutfitLink[]> {
  const { data, error } = await supabase
    .from("wishlist_item_outfits")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load wishlist outfit links: ${error.message}`);
  }

  return ((data as WishlistItemOutfitLinkRow[] | null) ?? []).map(
    normalizeWishlistItemOutfitLinkRecord,
  );
}

export async function getWishlistItemTripLinks(
  supabase: SupabaseClient,
): Promise<WishlistItemTripLink[]> {
  const { data, error } = await supabase
    .from("wishlist_item_trips")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load wishlist trip links: ${error.message}`);
  }

  return ((data as WishlistItemTripLinkRow[] | null) ?? []).map(normalizeWishlistItemTripLinkRecord);
}

export async function createWishlistItem(
  supabase: SupabaseClient,
  userId: string,
  input: WishlistItemInput,
) {
  const payload = {
    ...sanitizeWishlistItemInput(input),
    user_id: userId,
  };

  const { data, error } = await supabase.from("wishlist_items").insert(payload).select("*").single();

  if (error) {
    throw new Error(`Failed to create wishlist item: ${error.message}`);
  }

  const created = normalizeWishlistItemRecord(data as WishlistItemRow);

  await Promise.all([
    replaceWishlistItemOutfitLinks(supabase, userId, created.id, input.related_outfit_ids),
    replaceWishlistItemTripLinks(supabase, userId, created.id, input.related_trip_ids),
  ]);

  return created;
}

export async function updateWishlistItem(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  input: WishlistItemInput,
) {
  const payload = sanitizeWishlistItemInput(input);

  const { data, error } = await supabase
    .from("wishlist_items")
    .update(payload)
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update wishlist item: ${error.message}`);
  }

  await Promise.all([
    replaceWishlistItemOutfitLinks(supabase, userId, itemId, input.related_outfit_ids),
    replaceWishlistItemTripLinks(supabase, userId, itemId, input.related_trip_ids),
  ]);

  return normalizeWishlistItemRecord(data as WishlistItemRow);
}

export async function deleteWishlistItem(
  supabase: SupabaseClient,
  itemId: string,
) {
  const { error } = await supabase.from("wishlist_items").delete().eq("id", itemId);

  if (error) {
    throw new Error(`Failed to delete wishlist item: ${error.message}`);
  }
}

async function replaceWishlistItemOutfitLinks(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  outfitIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("wishlist_item_outfits")
    .delete()
    .eq("wishlist_item_id", itemId);

  if (deleteError) {
    throw new Error(`Failed to refresh wishlist outfit links: ${deleteError.message}`);
  }

  const uniqueOutfitIds = [...new Set(outfitIds.filter(Boolean))];

  if (uniqueOutfitIds.length === 0) {
    return;
  }

  const rows = uniqueOutfitIds.map((outfitId) => ({
    wishlist_item_id: itemId,
    outfit_id: outfitId,
    user_id: userId,
  }));

  const { error } = await supabase.from("wishlist_item_outfits").insert(rows);

  if (error) {
    throw new Error(`Failed to save wishlist outfit links: ${error.message}`);
  }
}

async function replaceWishlistItemTripLinks(
  supabase: SupabaseClient,
  userId: string,
  itemId: string,
  tripIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("wishlist_item_trips")
    .delete()
    .eq("wishlist_item_id", itemId);

  if (deleteError) {
    throw new Error(`Failed to refresh wishlist trip links: ${deleteError.message}`);
  }

  const uniqueTripIds = [...new Set(tripIds.filter(Boolean))];

  if (uniqueTripIds.length === 0) {
    return;
  }

  const rows = uniqueTripIds.map((tripId) => ({
    wishlist_item_id: itemId,
    trip_id: tripId,
    user_id: userId,
  }));

  const { error } = await supabase.from("wishlist_item_trips").insert(rows);

  if (error) {
    throw new Error(`Failed to save wishlist trip links: ${error.message}`);
  }
}
