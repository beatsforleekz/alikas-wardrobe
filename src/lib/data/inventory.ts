import type { SupabaseClient } from "@supabase/supabase-js";

import { sortInventoryItems } from "@/lib/inventory";
import type { InventoryItem } from "@/types/inventory";

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
