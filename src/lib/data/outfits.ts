import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeOutfitRecord } from "@/lib/outfits";
import type { Outfit } from "@/types/outfit";

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

export async function getOutfits(supabase: SupabaseClient): Promise<Outfit[]> {
  const { data, error } = await supabase
    .from("outfits")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load outfits: ${error.message}`);
  }

  return ((data as OutfitRow[] | null) ?? []).map(normalizeOutfitRecord);
}

export async function getOutfitById(
  supabase: SupabaseClient,
  outfitId: string,
): Promise<Outfit | null> {
  const { data, error } = await supabase.from("outfits").select("*").eq("id", outfitId).maybeSingle();

  if (error) {
    throw new Error(`Failed to load outfit ${outfitId}: ${error.message}`);
  }

  return data ? normalizeOutfitRecord(data as OutfitRow) : null;
}
