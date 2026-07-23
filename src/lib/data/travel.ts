import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeEssentialLibraryItemRecord,
  normalizeTripEssentialItemRecord,
  normalizeTripLookCategoryRecord,
  normalizeTripOutfitLinkRecord,
  normalizeTripItemReturnRecord,
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
  TripItemReturn,
  TripLookCategory,
  TripOutfitLink,
  TripWardrobeItem,
  TripWardrobeItemOutfitLink,
} from "@/types/travel";

function isMissingTripItemReturnsTableError(message: string) {
  return message.includes("Could not find the table 'public.trip_item_returns'") ||
    message.includes('relation "public.trip_item_returns" does not exist') ||
    message.includes('relation "trip_item_returns" does not exist');
}

function getMissingSchemaColumn(message: string) {
  const schemaCacheMatch = message.match(/Could not find the '([^']+)' column/);
  if (schemaCacheMatch?.[1]) {
    return schemaCacheMatch[1];
  }

  const postgresMatch = message.match(/column "?([^"\s]+)"? of relation/i);
  if (postgresMatch?.[1]) {
    return postgresMatch[1];
  }

  return null;
}

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

export async function getTripLookCategories(
  supabase: SupabaseClient,
  tripId: string,
): Promise<TripLookCategory[]> {
  const { data, error } = await supabase
    .from("trip_look_categories")
    .select("*")
    .eq("trip_id", tripId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load trip look categories: ${error.message}`);
  }

  return ((data as TripLookCategory[] | null) ?? []).map(normalizeTripLookCategoryRecord);
}

export async function createTripLookCategory(
  supabase: SupabaseClient,
  userId: string,
  tripId: string,
  name: string,
  sortOrder: number,
) {
  const { data, error } = await supabase
    .from("trip_look_categories")
    .insert({
      user_id: userId,
      trip_id: tripId,
      name: name.trim(),
      sort_order: sortOrder,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create trip look category: ${error.message}`);
  }

  return normalizeTripLookCategoryRecord(data as TripLookCategory);
}

export async function updateTripLookCategory(
  supabase: SupabaseClient,
  categoryId: string,
  input: Partial<Pick<TripLookCategory, "name" | "sort_order">>,
) {
  const payload = {
    ...(typeof input.name === "string" ? { name: input.name.trim() } : {}),
    ...(typeof input.sort_order === "number" ? { sort_order: input.sort_order } : {}),
  };

  const { data, error } = await supabase
    .from("trip_look_categories")
    .update(payload)
    .eq("id", categoryId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update trip look category: ${error.message}`);
  }

  return normalizeTripLookCategoryRecord(data as TripLookCategory);
}

export async function deleteTripLookCategory(
  supabase: SupabaseClient,
  categoryId: string,
) {
  const { error } = await supabase.from("trip_look_categories").delete().eq("id", categoryId);

  if (error) {
    throw new Error(`Failed to delete trip look category: ${error.message}`);
  }
}

export async function addTripOutfitLink(
  supabase: SupabaseClient,
  userId: string,
  tripId: string,
  outfitId: string,
  sortOrder: number,
  lookCategoryId?: string | null,
  categorySortOrder?: number,
) {
  const { data, error } = await supabase
    .from("trip_outfits")
    .insert({
      user_id: userId,
      trip_id: tripId,
      outfit_id: outfitId,
      look_category_id: lookCategoryId ?? null,
      sort_order: sortOrder,
      category_sort_order: categorySortOrder ?? sortOrder,
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
  if (links.length === 0) {
    return [];
  }

  const tripId = links[0]?.trip_id;

  for (const [index, link] of links.entries()) {
    const { error } = await supabase
      .from("trip_outfits")
      .update({
        sort_order: index,
        look_category_id: link.look_category_id,
        category_sort_order: link.category_sort_order,
      })
      .eq("id", link.id);

    if (error) {
      throw new Error(`Failed to reorder trip lookbooks: ${error.message}`);
    }
  }

  return getTripOutfitLinks(supabase, tripId);
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
    source: TripWardrobeItem["source"];
    packing_status?: TripWardrobeItem["packing_status"];
    capsule_status?: TripWardrobeItem["capsule_status"];
    required?: boolean;
    bag_assignment?: TripWardrobeItem["bag_assignment"];
    removed_from_capsule?: boolean;
    removed_from_capsule_at?: string | null;
    packed_at?: string | null;
    notes?: string | null;
    sort_order?: number;
  }>,
) {
  let payload = rows.map((row) => ({ ...row }));
  const unsupportedColumns = new Set<string>();

  while (true) {
    const { data, error } = await supabase
      .from("trip_wardrobe_items")
      .upsert(payload, { onConflict: "trip_id,wardrobe_item_id" })
      .select("*");

    if (!error) {
      return ((data as TripWardrobeItem[] | null) ?? []).map(normalizeTripWardrobeItemRecord);
    }

    const missingColumn = getMissingSchemaColumn(error.message);

    if (!missingColumn) {
      throw new Error(`Failed to save trip wardrobe items: ${error.message}`);
    }

    if (unsupportedColumns.has(missingColumn)) {
      throw new Error(`Failed to save trip wardrobe items: ${error.message}`);
    }

    unsupportedColumns.add(missingColumn);
    payload = payload.map((row) => {
      const nextRow = { ...row } as Record<string, unknown>;
      delete nextRow[missingColumn];
      return nextRow as typeof row;
    });
  }
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
    inclusion_type: TripEssentialItem["inclusion_type"];
    packing_status?: TripEssentialItem["packing_status"];
    required?: boolean;
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
    Pick<
      TripEssentialItem,
      "packing_status" | "notes" | "title" | "category" | "inclusion_type" | "required"
    >
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

export async function getTripItemReturns(
  supabase: SupabaseClient,
  tripId: string,
): Promise<TripItemReturn[]> {
  const { data, error } = await supabase
    .from("trip_item_returns")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTripItemReturnsTableError(error.message)) {
      return [];
    }

    throw new Error(`Failed to load trip return items: ${error.message}`);
  }

  return ((data as TripItemReturn[] | null) ?? []).map(normalizeTripItemReturnRecord);
}

export async function upsertTripItemReturn(
  supabase: SupabaseClient,
  row: {
    trip_id: string;
    wardrobe_item_id: string;
    user_id: string;
    return_status: TripItemReturn["return_status"];
    notes?: string | null;
  },
) {
  const { data, error } = await supabase
    .from("trip_item_returns")
    .upsert(row, { onConflict: "trip_id,wardrobe_item_id" })
    .select("*")
    .single();

  if (error) {
    if (isMissingTripItemReturnsTableError(error.message)) {
      throw new Error(
        "Trip return tracking is not enabled in Supabase yet. Please run the latest Travel Suite SQL that creates public.trip_item_returns.",
      );
    }

    throw new Error(`Failed to save trip return item: ${error.message}`);
  }

  return normalizeTripItemReturnRecord(data as TripItemReturn);
}
