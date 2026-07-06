export type InventoryItem = {
  id: string;
  item_id: string;
  category: string | null;
  item_name: string | null;
  colour: string | null;
  status: string | null;
  created_at: string | null;
  silhouette: string | null;
  vibe: string | null;
  shoot_level: string | null;
  travel_friendly: string | boolean | null;
  notes: string | null;
  set_name: string | null;
  season: string | null;
  image: string | null;
  user_id: string | null;
  style_type: string | null;
  tags: string | null;
};

export type InventoryFilters = {
  query: string;
  category: string;
  status: string;
  season: string;
  style_type: string;
  travel_friendly: string;
};

export type InventoryPageSize = 24 | 48 | 96 | "all";
