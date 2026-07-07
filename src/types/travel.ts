export type TripStatus = "draft" | "active" | "complete" | "archived";

export type Trip = {
  id: string;
  user_id: string | null;
  title: string;
  destination: string | null;
  notes: string | null;
  start_date: string | null;
  end_date: string | null;
  baggage_limit: string | null;
  baggage_notes: string | null;
  status: TripStatus;
  created_at: string | null;
  updated_at: string | null;
};

export type TripInput = {
  title: string;
  destination: string;
  notes: string;
  start_date: string;
  end_date: string;
  baggage_limit: string;
  baggage_notes: string;
  status: TripStatus;
};

export type TripOutfitLink = {
  id: string;
  trip_id: string;
  user_id: string | null;
  outfit_id: string;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type TripWardrobeItemSource = "outfit" | "manual";
export type TripPackingStatus = "pending" | "packed" | "not_required" | "missing";

export type TripWardrobeItem = {
  id: string;
  trip_id: string;
  user_id: string | null;
  wardrobe_item_id: string;
  source: TripWardrobeItemSource;
  packing_status: TripPackingStatus;
  notes: string | null;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type TripWardrobeItemOutfitLink = {
  id: string;
  trip_wardrobe_item_id: string;
  trip_outfit_id: string;
  created_at: string | null;
};

export type EssentialInclusionType =
  | "always_include"
  | "usually_include"
  | "optional"
  | "trip_specific";

export type EssentialLibraryItem = {
  id: string;
  user_id: string | null;
  title: string;
  category: string;
  inclusion_type: Exclude<EssentialInclusionType, "trip_specific">;
  notes: string | null;
  sort_order: number;
  is_archived: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type EssentialLibraryItemInput = {
  title: string;
  category: string;
  inclusion_type: Exclude<EssentialInclusionType, "trip_specific">;
  notes: string;
};

export type TripEssentialItem = {
  id: string;
  trip_id: string;
  user_id: string | null;
  source_library_item_id: string | null;
  title: string;
  category: string;
  inclusion_type: EssentialInclusionType;
  packing_status: TripPackingStatus;
  notes: string | null;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};
