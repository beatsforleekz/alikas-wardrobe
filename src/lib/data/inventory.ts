import type { SupabaseClient } from "@supabase/supabase-js";

import { sanitizeInventoryItemInput, sortInventoryItems } from "@/lib/inventory";
import type {
  InventoryBulkActionInput,
  InventoryItem,
  InventoryItemInput,
} from "@/types/inventory";

export async function getInventoryItems(supabase: SupabaseClient): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("item_id", { ascending: true });

  if (error) {
    throw new Error(`Failed to load inventory: ${error.message}`);
  }

  return sortInventoryItems((data as InventoryItem[] | null) ?? []);
}

export async function getInventoryItemByItemId(
  supabase: SupabaseClient,
  itemId: string,
): Promise<InventoryItem | null> {
  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .eq("item_id", itemId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load inventory item ${itemId}: ${error.message}`);
  }

  return (data as InventoryItem | null) ?? null;
}

export async function createInventoryItem(
  supabase: SupabaseClient,
  userId: string,
  input: InventoryItemInput,
) {
  const payload = {
    ...sanitizeInventoryItemInput(input),
    user_id: userId,
  };

  const { data, error } = await supabase.from("inventory").insert(payload).select("*").single();

  if (error) {
    throw new Error(`Failed to create inventory item: ${error.message}`);
  }

  return data as InventoryItem;
}

export async function updateInventoryItem(
  supabase: SupabaseClient,
  id: string,
  input: InventoryItemInput,
) {
  const payload = sanitizeInventoryItemInput(input);

  const { data, error } = await supabase
    .from("inventory")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update inventory item: ${error.message}`);
  }

  return data as InventoryItem;
}

export async function updateInventoryItemStatus(
  supabase: SupabaseClient,
  id: string,
  status: string,
) {
  const { data, error } = await supabase
    .from("inventory")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update inventory item status: ${error.message}`);
  }

  return data as InventoryItem;
}

export async function deleteInventoryItem(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("inventory").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete inventory item: ${error.message}`);
  }
}

export async function bulkUpdateInventoryItems(
  supabase: SupabaseClient,
  items: InventoryItem[],
  ids: string[],
  action: InventoryBulkActionInput,
) {
  const targetIds = new Set(ids);
  const targetItems = items.filter((item) => targetIds.has(item.id));

  if (targetItems.length === 0) {
    return [] as InventoryItem[];
  }

  const updates = targetItems.map((item) => {
    switch (action.type) {
      case "archive":
        return { id: item.id, status: "Archived" };
      case "restore":
        return { id: item.id, status: "Available" };
      case "status":
        return { id: item.id, status: action.value.trim() };
      case "category":
        return { id: item.id, category: action.value.trim() };
      case "tags": {
        const currentTags = (item.tags ?? "")
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
        const nextTags = action.value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
        const mergedTags = [...new Set([...currentTags, ...nextTags])];
        return { id: item.id, tags: mergedTags.length ? mergedTags.join(", ") : null };
      }
    }
  });

  const { data, error } = await supabase.from("inventory").upsert(updates).select("*");

  if (error) {
    throw new Error(`Failed to apply bulk update: ${error.message}`);
  }

  return (data as InventoryItem[] | null) ?? [];
}
