import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeOutfitRecord, sanitizeOutfitInput } from "@/lib/outfits";
import type { Outfit, OutfitInput } from "@/types/outfit";

type OutfitRow = {
  id: string;
  user_id: string | null;
  name: string | null;
  item_ids: unknown;
  notes: string | null;
  created_at: string | null;
  updated_at?: string | null;
  tags: string | null;
  occasion: string | null;
  trip?: string | null;
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

export async function createOutfit(
  supabase: SupabaseClient,
  userId: string,
  input: OutfitInput,
) {
  const payload = {
    ...sanitizeOutfitInput(input),
    user_id: userId,
  };

  const { data, error } = await supabase.from("outfits").insert(payload).select("*").single();

  if (error) {
    throw new Error(`Failed to create outfit: ${error.message}`);
  }

  return normalizeOutfitRecord(data as OutfitRow);
}

export async function updateOutfit(
  supabase: SupabaseClient,
  id: string,
  input: OutfitInput,
) {
  const payload = sanitizeOutfitInput(input);

  const { data, error } = await supabase
    .from("outfits")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update outfit: ${error.message}`);
  }

  return normalizeOutfitRecord(data as OutfitRow);
}

export async function deleteOutfit(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from("outfits").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete outfit: ${error.message}`);
  }
}
