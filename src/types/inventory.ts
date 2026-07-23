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

export type InventoryItemInput = {
  item_id: string;
  category: string;
  item_name: string;
  colour: string;
  status: string;
  silhouette: string;
  vibe: string;
  shoot_level: string;
  travel_friendly: string;
  notes: string;
  set_name: string;
  season: string;
  image: string;
  style_type: string;
  tags: string;
};

export type InventoryBulkActionInput =
  | { type: "archive" }
  | { type: "restore" }
  | { type: "status"; value: string }
  | { type: "category"; value: string }
  | { type: "tags"; value: string };

export type InventoryFilters = {
  query: string;
  category: string;
  status: string;
  season: string;
  style_type: string;
  travel_friendly: string;
  image_state: string;
};

export type InventoryPageSize = 24 | 48 | 96 | "all";
