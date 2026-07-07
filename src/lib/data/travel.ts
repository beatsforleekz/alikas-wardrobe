import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeEssentialLibraryItemRecord,
  normalizeTripEssentialItemRecord,
  normalizeTripOutfitLinkRecord,
  normalizeTripRecord,
  normalizeTripWardrobeItemOutfitLinkRecord,
  normalizeTripWardrobeItemRecord,
  sanitizeEssentialLibraryItemInput,
  sanitizeTripInput,
} from "@/lib/travel";
import type {
  EssentialLibraryItem,
  EssentialLibraryItemInput,
  Trip,
  TripEssentialItem,
  TripInput,
  TripOutfitLink,
  TripWardrobeItem,
  TripWardrobeItemOutfitLink,
} from "@/types/travel";

export async function getTrips(supabase: SupabaseClient): Promise<Trip[]> {
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("start_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load trips: ${error.message}`);
  }

  return ((data as Trip[] | null) ?? []).map(normalizeTripRecord);
}

export async function getTripById(supabase: SupabaseClient, tripId: string): Promise<Trip | null> {
  const { data, error } = await supabase.from("trips").select("*").eq("id", tripId).maybeSingle();

  if (error) {
    throw new Error(`Failed to load trip: ${error.message}`);
  }

  return data ? normalizeTripRecord(data as Trip) : null;
}

export async function createTrip(supabase: SupabaseClient, userId: string, input: TripInput) {
  const payload = {
    ...sanitizeTripInput(input),
    user_id: userId,
  };

  const { data, error } = await supabase.from("trips").insert(payload).select("*").single();

  if (error) {
    throw new Error(`Failed to create trip: ${error.message}`);
  }

  return normalizeTripRecord(data as Trip);
}

export async function updateTrip(supabase: SupabaseClient, tripId: string, input: TripInput) {
  const payload = sanitizeTripInput(input);

  const { data, error } = await supabase
    .from("trips")
    .update(payload)
    .eq("id", tripId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update trip: ${error.message}`);
  }

  return normalizeTripRecord(data as Trip);
}

export async function getTripOutfitLinks(
  supabase: SupabaseClient,
  tripId?: string,
): Promise<TripOutfitLink[]> {
  let query = supabase
    .from("trip_outfits")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (tripId) {
    query = query.eq("trip_id", tripId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load trip outfits: ${error.message}`);
  }

  return ((data as TripOutfitLink[] | null) ?? []).map(normalizeTripOutfitLinkRecord);
}

export async function addTripOutfitLink(
  supabase: SupabaseClient,
  userId: string,
  tripId: string,
  outfitId: string,
  sortOrder: number,
) {
  const { data, error } = await supabase
    .from("trip_outfits")
    .insert({
      user_id: userId,
      trip_id: tripId,
      outfit_id: outfitId,
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to add lookbook to trip: ${error.message}`);
  }

  return normalizeTripOutfitLinkRecord(data as TripOutfitLink);
}

export async function deleteTripOutfitLink(supabase: SupabaseClient, tripOutfitLinkId: string) {
  const { error } = await supabase.from("trip_outfits").delete().eq("id", tripOutfitLinkId);

  if (error) {
    throw new Error(`Failed to remove lookbook from trip: ${error.message}`);
  }
}

export async function reorderTripOutfitLinks(
  supabase: SupabaseClient,
  links: TripOutfitLink[],
) {
  const updates = links.map((link, index) => ({
    id: link.id,
    sort_order: index,
  }));

  const { data, error } = await supabase.from("trip_outfits").upsert(updates).select("*");

  if (error) {
    throw new Error(`Failed to reorder trip lookbooks: ${error.message}`);
  }

  return ((data as TripOutfitLink[] | null) ?? []).map(normalizeTripOutfitLinkRecord);
}

export async function getTripWardrobeItems(
  supabase: SupabaseClient,
  tripId: string,
): Promise<TripWardrobeItem[]> {
  const { data, error } = await supabase
    .from("trip_wardrobe_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load trip wardrobe items: ${error.message}`);
  }

  return ((data as TripWardrobeItem[] | null) ?? []).map(normalizeTripWardrobeItemRecord);
}

export async function upsertTripWardrobeItems(
  supabase: SupabaseClient,
  rows: Array<{
    trip_id: string;
    user_id: string;
    wardrobe_item_id: string;
    source: "outfit" | "manual";
    packing_status?: "pending" | "packed" | "not_required" | "missing";
    notes?: string | null;
    sort_order?: number;
  }>,
) {
  const { data, error } = await supabase
    .from("trip_wardrobe_items")
    .upsert(rows, { onConflict: "trip_id,wardrobe_item_id" })
    .select("*");

  if (error) {
    throw new Error(`Failed to save trip wardrobe items: ${error.message}`);
  }

  return ((data as TripWardrobeItem[] | null) ?? []).map(normalizeTripWardrobeItemRecord);
}

export async function deleteTripWardrobeItems(
  supabase: SupabaseClient,
  ids: string[],
) {
  if (ids.length === 0) {
    return;
  }

  const { error } = await supabase.from("trip_wardrobe_items").delete().in("id", ids);

  if (error) {
    throw new Error(`Failed to remove trip wardrobe items: ${error.message}`);
  }
}

export async function getTripWardrobeItemOutfitLinks(
  supabase: SupabaseClient,
  tripId: string,
): Promise<TripWardrobeItemOutfitLink[]> {
  const { data, error } = await supabase
    .from("trip_wardrobe_item_outfits")
    .select("*, trip_wardrobe_items!inner(trip_id)")
    .eq("trip_wardrobe_items.trip_id", tripId);

  if (error) {
    throw new Error(`Failed to load trip wardrobe outfit links: ${error.message}`);
  }

  return ((data as Array<TripWardrobeItemOutfitLink & { trip_wardrobe_items?: unknown }> | null) ?? []).map(
    (row) =>
      normalizeTripWardrobeItemOutfitLinkRecord({
        id: row.id,
        trip_wardrobe_item_id: row.trip_wardrobe_item_id,
        trip_outfit_id: row.trip_outfit_id,
        created_at: row.created_at,
      }),
  );
}

export async function upsertTripWardrobeItemOutfitLinks(
  supabase: SupabaseClient,
  rows: Array<{
    trip_wardrobe_item_id: string;
    trip_outfit_id: string;
  }>,
) {
  if (rows.length === 0) {
    return [] as TripWardrobeItemOutfitLink[];
  }

  const { data, error } = await supabase
    .from("trip_wardrobe_item_outfits")
    .upsert(rows, { onConflict: "trip_wardrobe_item_id,trip_outfit_id" })
    .select("*");

  if (error) {
    throw new Error(`Failed to save trip wardrobe look links: ${error.message}`);
  }

  return ((data as TripWardrobeItemOutfitLink[] | null) ?? []).map(
    normalizeTripWardrobeItemOutfitLinkRecord,
  );
}

export async function deleteTripWardrobeItemOutfitLinks(
  supabase: SupabaseClient,
  ids: string[],
) {
  if (ids.length === 0) {
    return;
  }

  const { error } = await supabase.from("trip_wardrobe_item_outfits").delete().in("id", ids);

  if (error) {
    throw new Error(`Failed to remove trip wardrobe look links: ${error.message}`);
  }
}

export async function getEssentialLibraryItems(
  supabase: SupabaseClient,
): Promise<EssentialLibraryItem[]> {
  const { data, error } = await supabase
    .from("essentials_library_items")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load essentials library: ${error.message}`);
  }

  return ((data as EssentialLibraryItem[] | null) ?? []).map(normalizeEssentialLibraryItemRecord);
}

export async function createEssentialLibraryItem(
  supabase: SupabaseClient,
  userId: string,
  input: EssentialLibraryItemInput,
) {
  const payload = {
    ...sanitizeEssentialLibraryItemInput(input),
    user_id: userId,
  };

  const { data, error } = await supabase
    .from("essentials_library_items")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create essentials item: ${error.message}`);
  }

  return normalizeEssentialLibraryItemRecord(data as EssentialLibraryItem);
}

export async function createEssentialLibraryItems(
  supabase: SupabaseClient,
  userId: string,
  inputs: EssentialLibraryItemInput[],
) {
  if (inputs.length === 0) {
    return [] as EssentialLibraryItem[];
  }

  const payload = inputs.map((input) => ({
    ...sanitizeEssentialLibraryItemInput(input),
    user_id: userId,
  }));

  const { data, error } = await supabase
    .from("essentials_library_items")
    .insert(payload)
    .select("*");

  if (error) {
    throw new Error(`Failed to create essentials items: ${error.message}`);
  }

  return ((data as EssentialLibraryItem[] | null) ?? []).map(normalizeEssentialLibraryItemRecord);
}

export async function updateEssentialLibraryItem(
  supabase: SupabaseClient,
  itemId: string,
  input: EssentialLibraryItemInput,
) {
  const { data, error } = await supabase
    .from("essentials_library_items")
    .update(sanitizeEssentialLibraryItemInput(input))
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update essentials item: ${error.message}`);
  }

  return normalizeEssentialLibraryItemRecord(data as EssentialLibraryItem);
}

export async function deleteEssentialLibraryItem(supabase: SupabaseClient, itemId: string) {
  const { error } = await supabase.from("essentials_library_items").delete().eq("id", itemId);

  if (error) {
    throw new Error(`Failed to delete essentials item: ${error.message}`);
  }
}

export async function reorderEssentialLibraryItems(
  supabase: SupabaseClient,
  items: EssentialLibraryItem[],
) {
  const updates = items.map((item, index) => ({
    id: item.id,
    sort_order: index,
  }));

  const { data, error } = await supabase.from("essentials_library_items").upsert(updates).select("*");

  if (error) {
    throw new Error(`Failed to reorder essentials items: ${error.message}`);
  }

  return ((data as EssentialLibraryItem[] | null) ?? []).map(normalizeEssentialLibraryItemRecord);
}

export async function getTripEssentialItems(
  supabase: SupabaseClient,
  tripId: string,
): Promise<TripEssentialItem[]> {
  const { data, error } = await supabase
    .from("trip_essential_items")
    .select("*")
    .eq("trip_id", tripId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load trip essentials: ${error.message}`);
  }

  return ((data as TripEssentialItem[] | null) ?? []).map(normalizeTripEssentialItemRecord);
}

export async function createTripEssentialItems(
  supabase: SupabaseClient,
  rows: Array<{
    trip_id: string;
    user_id: string;
    source_library_item_id?: string | null;
    title: string;
    category: string;
    inclusion_type: "always_include" | "usually_include" | "optional" | "trip_specific";
    packing_status?: "pending" | "packed" | "not_required" | "missing";
    notes?: string | null;
    sort_order?: number;
  }>,
) {
  if (rows.length === 0) {
    return [] as TripEssentialItem[];
  }

  const { data, error } = await supabase.from("trip_essential_items").insert(rows).select("*");

  if (error) {
    throw new Error(`Failed to create trip essentials: ${error.message}`);
  }

  return ((data as TripEssentialItem[] | null) ?? []).map(normalizeTripEssentialItemRecord);
}

export async function updateTripEssentialItem(
  supabase: SupabaseClient,
  itemId: string,
  updates: Partial<
    Pick<TripEssentialItem, "packing_status" | "notes" | "title" | "category" | "inclusion_type">
  >,
) {
  const { data, error } = await supabase
    .from("trip_essential_items")
    .update(updates)
    .eq("id", itemId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update trip essential: ${error.message}`);
  }

  return normalizeTripEssentialItemRecord(data as TripEssentialItem);
}

export async function deleteTripEssentialItem(supabase: SupabaseClient, itemId: string) {
  const { error } = await supabase.from("trip_essential_items").delete().eq("id", itemId);

  if (error) {
    throw new Error(`Failed to delete trip essential: ${error.message}`);
  }
}

export async function reorderTripEssentialItems(
  supabase: SupabaseClient,
  items: TripEssentialItem[],
) {
  const updates = items.map((item, index) => ({
    id: item.id,
    sort_order: index,
  }));

  const { data, error } = await supabase.from("trip_essential_items").upsert(updates).select("*");

  if (error) {
    throw new Error(`Failed to reorder trip essentials: ${error.message}`);
  }

  return ((data as TripEssentialItem[] | null) ?? []).map(normalizeTripEssentialItemRecord);
}
