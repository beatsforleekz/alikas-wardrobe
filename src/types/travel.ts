export type TripStatus =
  | "draft"
  | "ready_for_review"
  | "approved_for_packing"
  | "packing"
  | "packed"
  | "travelling"
  | "unpacking"
  | "completed"
  | "archived";

export type TripLuggageType =
  | "Cabin bag"
  | "Small checked suitcase"
  | "Medium checked suitcase"
  | "Large checked suitcase"
  | "Custom";

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
  luggage_type: TripLuggageType | null;
  number_of_bags: number;
  weight_allowance: string | null;
  luggage_dimensions: string | null;
  luggage_assignment_notes: string | null;
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
  luggage_type: string;
  number_of_bags: number;
  weight_allowance: string;
  luggage_dimensions: string;
  luggage_assignment_notes: string;
  status: TripStatus;
};

export type TripLookStatus =
  | "active"
  | "optional"
  | "excluded"
  | "incomplete"
  | "ready";

export type TripOutfitLink = {
  id: string;
  trip_id: string;
  user_id: string | null;
  outfit_id: string;
  look_category_id: string | null;
  look_category: string | null;
  occasion: string | null;
  planned_date: string | null;
  status: TripLookStatus;
  notes: string | null;
  sort_order: number;
  category_sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type TripLookCategory = {
  id: string;
  trip_id: string;
  user_id: string | null;
  name: string;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type TripWardrobeItemSource = "outfit" | "manual" | "to_buy";
export type TripCapsuleStatus = "confirmed" | "optional" | "to_buy" | "excluded";
export type TripPackingStatus =
  | "not_packed"
  | "waiting_for_laundry"
  | "packed"
  | "to_buy"
  | "unavailable"
  | "not_required"
  | "removed";

export type TripBagAssignment =
  | "Checked suitcase"
  | "Cabin bag"
  | "Personal item"
  | "Wearing for travel"
  | "Unassigned";

export type TripWardrobeItem = {
  id: string;
  trip_id: string;
  user_id: string | null;
  wardrobe_item_id: string;
  source: TripWardrobeItemSource;
  packing_status: TripPackingStatus;
  capsule_status: TripCapsuleStatus;
  required: boolean;
  bag_assignment: TripBagAssignment | null;
  removed_from_capsule: boolean;
  removed_from_capsule_at: string | null;
  packed_at: string | null;
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
  packing_status: Exclude<TripPackingStatus, "waiting_for_laundry" | "removed">;
  required: boolean;
  notes: string | null;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type TripItemReturnStatus =
  | "returned_to_wardrobe"
  | "in_laundry"
  | "damaged"
  | "lost"
  | "discarded"
  | "still_packed";

export type TripItemReturn = {
  id: string;
  trip_id: string;
  wardrobe_item_id: string;
  user_id: string | null;
  return_status: TripItemReturnStatus;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};
