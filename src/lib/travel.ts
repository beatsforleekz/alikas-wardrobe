import type {
  EssentialLibraryItem,
  EssentialLibraryItemInput,
  Trip,
  TripBagAssignment,
  TripCapsuleStatus,
  TripEssentialItem,
  TripInput,
  TripItemReturn,
  TripItemReturnStatus,
  TripLookCategory,
  TripLookStatus,
  TripOutfitLink,
  TripPackingStatus,
  TripStatus,
  TripWardrobeItem,
  TripWardrobeItemOutfitLink,
} from "@/types/travel";

type TripRow = {
  id: string;
  user_id: string | null;
  title: string | null;
  destination: string | null;
  notes: string | null;
  start_date: string | null;
  end_date: string | null;
  baggage_limit: string | null;
  baggage_notes: string | null;
  luggage_type: string | null;
  number_of_bags: number | null;
  weight_allowance: string | null;
  luggage_dimensions: string | null;
  luggage_assignment_notes: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type TripOutfitLinkRow = {
  id: string;
  trip_id: string;
  user_id: string | null;
  outfit_id: string;
  look_category_id?: string | null;
  look_category?: string | null;
  occasion?: string | null;
  planned_date?: string | null;
  status?: string | null;
  notes?: string | null;
  sort_order: number | null;
  category_sort_order?: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type TripLookCategoryRow = {
  id: string;
  trip_id: string;
  user_id: string | null;
  name: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type TripWardrobeItemRow = {
  id: string;
  trip_id: string;
  user_id: string | null;
  wardrobe_item_id: string;
  source: string | null;
  packing_status: string | null;
  capsule_status?: string | null;
  required?: boolean | null;
  bag_assignment?: string | null;
  removed_from_capsule?: boolean | null;
  removed_from_capsule_at?: string | null;
  packed_at?: string | null;
  notes: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type TripWardrobeItemOutfitLinkRow = {
  id: string;
  trip_wardrobe_item_id: string;
  trip_outfit_id: string;
  created_at: string | null;
};

type EssentialLibraryItemRow = {
  id: string;
  user_id: string | null;
  title: string | null;
  category: string | null;
  inclusion_type: string | null;
  notes: string | null;
  sort_order: number | null;
  is_archived: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type TripEssentialItemRow = {
  id: string;
  trip_id: string;
  user_id: string | null;
  source_library_item_id: string | null;
  title: string | null;
  category: string | null;
  inclusion_type: string | null;
  packing_status: string | null;
  required?: boolean | null;
  notes: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type TripItemReturnRow = {
  id: string;
  trip_id: string;
  wardrobe_item_id: string;
  user_id: string | null;
  return_status: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export const TRIP_STATUS_OPTIONS: TripStatus[] = [
  "draft",
  "ready_for_review",
  "approved_for_packing",
  "packing",
  "packed",
  "travelling",
  "unpacking",
  "completed",
  "archived",
];

export const TRIP_PACKING_STATUS_OPTIONS: TripPackingStatus[] = [
  "not_packed",
  "waiting_for_laundry",
  "packed",
  "to_buy",
  "unavailable",
  "not_required",
  "removed",
];

export const TRIP_CAPSULE_STATUS_OPTIONS: TripCapsuleStatus[] = [
  "confirmed",
  "optional",
  "to_buy",
  "excluded",
];

export const TRIP_LOOK_STATUS_OPTIONS: TripLookStatus[] = [
  "active",
  "optional",
  "excluded",
  "incomplete",
  "ready",
];

export const TRIP_BAG_ASSIGNMENT_OPTIONS: TripBagAssignment[] = [
  "Checked suitcase",
  "Cabin bag",
  "Personal item",
  "Wearing for travel",
  "Unassigned",
];

export const TRIP_RETURN_STATUS_OPTIONS: TripItemReturnStatus[] = [
  "returned_to_wardrobe",
  "in_laundry",
  "damaged",
  "lost",
  "discarded",
  "still_packed",
];

export const TRIP_LUGGAGE_TYPE_OPTIONS = [
  "Cabin bag",
  "Small checked suitcase",
  "Medium checked suitcase",
  "Large checked suitcase",
  "Custom",
] as const;

export const ESSENTIAL_CATEGORY_OPTIONS = [
  "Flight",
  "Documents",
  "Electronics",
  "Medication",
  "Toiletries",
  "Toiletries / Makeup",
  "Beauty",
  "Hair",
  "Sleep",
  "Accessories",
  "Entertainment",
  "Miscellaneous",
  "Custom",
] as const;

export const ESSENTIAL_INCLUSION_OPTIONS = [
  "always_include",
  "usually_include",
  "optional",
] as const;

export const defaultTripInput: TripInput = {
  title: "",
  destination: "",
  notes: "",
  start_date: "",
  end_date: "",
  baggage_limit: "",
  baggage_notes: "",
  luggage_type: "",
  number_of_bags: 1,
  weight_allowance: "",
  luggage_dimensions: "",
  luggage_assignment_notes: "",
  status: "draft",
};

export const defaultEssentialLibraryItemInput: EssentialLibraryItemInput = {
  title: "",
  category: ESSENTIAL_CATEGORY_OPTIONS[0],
  inclusion_type: "usually_include",
  notes: "",
};

export const STARTER_ESSENTIAL_LIBRARY_ITEMS: EssentialLibraryItemInput[] = [
  { title: "Neck pillow", category: "Flight", inclusion_type: "optional", notes: "" },
  { title: "Currency", category: "Flight", inclusion_type: "usually_include", notes: "" },
  { title: "iPad charged", category: "Flight", inclusion_type: "usually_include", notes: "" },
  { title: "Pads / tampons", category: "Flight", inclusion_type: "usually_include", notes: "" },
  { title: "Portable charger", category: "Flight", inclusion_type: "always_include", notes: "" },
  { title: "Travel adaptor", category: "Flight", inclusion_type: "always_include", notes: "" },
  { title: "Passport", category: "Flight", inclusion_type: "always_include", notes: "" },
  { title: "Download shows", category: "Flight", inclusion_type: "optional", notes: "" },
  { title: "Check-in & boarding pass", category: "Flight", inclusion_type: "always_include", notes: "" },
  { title: "Headphones", category: "Flight", inclusion_type: "usually_include", notes: "" },
  { title: "Medication paperwork", category: "Flight", inclusion_type: "usually_include", notes: "" },
  { title: "Charging cables", category: "Flight", inclusion_type: "always_include", notes: "" },
  { title: "Hotel / accommodation details", category: "Flight", inclusion_type: "always_include", notes: "" },
  { title: "Travel insurance", category: "Flight", inclusion_type: "always_include", notes: "" },
  { title: "ID copy (phone screenshot)", category: "Flight", inclusion_type: "always_include", notes: "" },
  { title: "Pyjamas", category: "Sleep", inclusion_type: "usually_include", notes: "" },
  { title: "Bonnet", category: "Sleep", inclusion_type: "usually_include", notes: "" },
  { title: "Sunhat", category: "Accessories", inclusion_type: "usually_include", notes: "" },
  { title: "Earrings", category: "Accessories", inclusion_type: "usually_include", notes: "" },
  { title: "Knickers", category: "Accessories", inclusion_type: "always_include", notes: "" },
  { title: "Scissors", category: "Accessories", inclusion_type: "optional", notes: "" },
  { title: "Socks", category: "Accessories", inclusion_type: "always_include", notes: "" },
  { title: "Sunglasses (4)", category: "Accessories", inclusion_type: "usually_include", notes: "" },
  { title: "Mosquito spray", category: "Toiletries / Makeup", inclusion_type: "usually_include", notes: "" },
  { title: "Ziploc bags", category: "Toiletries / Makeup", inclusion_type: "usually_include", notes: "" },
  { title: "Towel", category: "Toiletries / Makeup", inclusion_type: "usually_include", notes: "" },
  { title: "Makeup brushes", category: "Toiletries / Makeup", inclusion_type: "usually_include", notes: "" },
  { title: "Waterproof pouch", category: "Toiletries / Makeup", inclusion_type: "usually_include", notes: "" },
  { title: "Sunscreen", category: "Toiletries / Makeup", inclusion_type: "always_include", notes: "" },
  { title: "Fexofenadine", category: "Toiletries / Makeup", inclusion_type: "usually_include", notes: "" },
  { title: "Hairbands", category: "Toiletries / Makeup", inclusion_type: "usually_include", notes: "" },
  { title: "Body oil", category: "Toiletries / Makeup", inclusion_type: "usually_include", notes: "" },
  { title: "Hair oil", category: "Toiletries / Makeup", inclusion_type: "usually_include", notes: "" },
  { title: "Eyebrow pencil", category: "Toiletries / Makeup", inclusion_type: "usually_include", notes: "" },
  { title: "Toothbrush", category: "Toiletries / Makeup", inclusion_type: "always_include", notes: "" },
  { title: "Razors", category: "Toiletries / Makeup", inclusion_type: "usually_include", notes: "" },
];

export function normalizeTripRecord(row: TripRow): Trip {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title?.trim() || "Untitled trip",
    destination: row.destination?.trim() || null,
    notes: row.notes?.trim() || null,
    start_date: row.start_date || null,
    end_date: row.end_date || null,
    baggage_limit: row.baggage_limit?.trim() || null,
    baggage_notes: row.baggage_notes?.trim() || null,
    luggage_type: normalizeLuggageType(row.luggage_type),
    number_of_bags: row.number_of_bags && row.number_of_bags > 0 ? row.number_of_bags : 1,
    weight_allowance: row.weight_allowance?.trim() || null,
    luggage_dimensions: row.luggage_dimensions?.trim() || null,
    luggage_assignment_notes: row.luggage_assignment_notes?.trim() || null,
    status: normalizeTripStatus(row.status),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeTripOutfitLinkRecord(row: TripOutfitLinkRow): TripOutfitLink {
  return {
    id: row.id,
    trip_id: row.trip_id,
    user_id: row.user_id,
    outfit_id: row.outfit_id,
    look_category_id: row.look_category_id ?? null,
    look_category: row.look_category?.trim() || null,
    occasion: row.occasion?.trim() || null,
    planned_date: row.planned_date || null,
    status: normalizeTripLookStatus(row.status),
    notes: row.notes?.trim() || null,
    sort_order: row.sort_order ?? 0,
    category_sort_order: row.category_sort_order ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeTripLookCategoryRecord(row: TripLookCategoryRow): TripLookCategory {
  return {
    id: row.id,
    trip_id: row.trip_id,
    user_id: row.user_id,
    name: row.name?.trim() || "Untitled category",
    sort_order: row.sort_order ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeTripWardrobeItemRecord(row: TripWardrobeItemRow): TripWardrobeItem {
  return {
    id: row.id,
    trip_id: row.trip_id,
    user_id: row.user_id,
    wardrobe_item_id: row.wardrobe_item_id,
    source: normalizeTripWardrobeItemSource(row.source),
    packing_status: normalizeTripPackingStatus(row.packing_status),
    capsule_status: normalizeTripCapsuleStatus(row.capsule_status),
    required: row.required ?? true,
    bag_assignment: normalizeBagAssignment(row.bag_assignment),
    removed_from_capsule: Boolean(row.removed_from_capsule),
    removed_from_capsule_at: row.removed_from_capsule_at || null,
    packed_at: row.packed_at || null,
    notes: row.notes?.trim() || null,
    sort_order: row.sort_order ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeTripWardrobeItemOutfitLinkRecord(
  row: TripWardrobeItemOutfitLinkRow,
): TripWardrobeItemOutfitLink {
  return {
    id: row.id,
    trip_wardrobe_item_id: row.trip_wardrobe_item_id,
    trip_outfit_id: row.trip_outfit_id,
    created_at: row.created_at,
  };
}

export function normalizeEssentialLibraryItemRecord(row: EssentialLibraryItemRow): EssentialLibraryItem {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title?.trim() || "Untitled essential",
    category: row.category?.trim() || "Custom",
    inclusion_type: normalizeEssentialInclusionType(row.inclusion_type),
    notes: row.notes?.trim() || null,
    sort_order: row.sort_order ?? 0,
    is_archived: Boolean(row.is_archived),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeTripEssentialItemRecord(row: TripEssentialItemRow): TripEssentialItem {
  return {
    id: row.id,
    trip_id: row.trip_id,
    user_id: row.user_id,
    source_library_item_id: row.source_library_item_id,
    title: row.title?.trim() || "Untitled essential",
    category: row.category?.trim() || "Custom",
    inclusion_type: normalizeTripEssentialInclusionType(row.inclusion_type),
    packing_status: normalizeTripEssentialPackingStatus(row.packing_status),
    required: row.required ?? true,
    notes: row.notes?.trim() || null,
    sort_order: row.sort_order ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function normalizeTripItemReturnRecord(row: TripItemReturnRow): TripItemReturn {
  return {
    id: row.id,
    trip_id: row.trip_id,
    wardrobe_item_id: row.wardrobe_item_id,
    user_id: row.user_id,
    return_status: normalizeTripItemReturnStatus(row.return_status),
    notes: row.notes?.trim() || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function sanitizeTripInput(input: TripInput) {
  return {
    title: input.title.trim(),
    destination: nullableValue(input.destination),
    notes: nullableValue(input.notes),
    start_date: nullableValue(input.start_date),
    end_date: nullableValue(input.end_date),
    baggage_limit: nullableValue(input.baggage_limit),
    baggage_notes: nullableValue(input.baggage_notes),
    luggage_type: nullableValue(input.luggage_type),
    number_of_bags: Math.max(1, Number(input.number_of_bags || 1)),
    weight_allowance: nullableValue(input.weight_allowance),
    luggage_dimensions: nullableValue(input.luggage_dimensions),
    luggage_assignment_notes: nullableValue(input.luggage_assignment_notes),
    status: normalizeTripStatus(input.status),
  };
}

export function sanitizeEssentialLibraryItemInput(input: EssentialLibraryItemInput) {
  return {
    title: input.title.trim(),
    category: input.category.trim() || "Custom",
    inclusion_type: normalizeEssentialInclusionType(input.inclusion_type),
    notes: nullableValue(input.notes),
  };
}

export function formatTripDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) {
    return "Dates to be decided";
  }
  const start = startDate ? formatDate(startDate) : null;
  const end = endDate ? formatDate(endDate) : null;
  if (start && end) return `${start} - ${end}`;
  return start || end || "Dates to be decided";
}

export function formatTripStatus(status: TripStatus) {
  return status.replace(/_/g, " ");
}

export function formatPackingStatusLabel(status: TripPackingStatus) {
  return status.replace(/_/g, " ");
}

export function formatTripCapsuleStatus(status: TripCapsuleStatus) {
  return status.replace(/_/g, " ");
}

export function formatTripLookStatus(status: TripLookStatus) {
  return status.replace(/_/g, " ");
}

export function formatEssentialInclusionType(value: EssentialLibraryItem["inclusion_type"] | TripEssentialItem["inclusion_type"]) {
  return value.replace(/_/g, " ");
}

export function formatTripReturnStatus(status: TripItemReturnStatus) {
  return status.replace(/_/g, " ");
}

export function isEssentialRequired(value: TripEssentialItem["inclusion_type"]) {
  return value === "always_include" || value === "usually_include" || value === "trip_specific";
}

export function isPackingStatusResolved(status: TripPackingStatus | TripEssentialItem["packing_status"]) {
  return ["packed", "not_required", "to_buy", "unavailable", "removed"].includes(status);
}

export function getTripDurationLabel(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) {
    return "Dates flexible";
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  const differenceInDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
  return `${differenceInDays} day${differenceInDays === 1 ? "" : "s"}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}

function nullableValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeTripStatus(value: string | null | undefined): TripStatus {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "draft";
  if (TRIP_STATUS_OPTIONS.includes(normalized as TripStatus)) return normalized as TripStatus;
  if (normalized === "active") return "packing";
  if (normalized === "complete") return "completed";
  return "draft";
}

function normalizeTripPackingStatus(value: string | null | undefined): TripPackingStatus {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "not_packed";
  if (TRIP_PACKING_STATUS_OPTIONS.includes(normalized as TripPackingStatus)) {
    return normalized as TripPackingStatus;
  }
  if (normalized === "pending") return "not_packed";
  if (normalized === "missing") return "unavailable";
  return "not_packed";
}

function normalizeTripEssentialPackingStatus(value: string | null | undefined): TripEssentialItem["packing_status"] {
  const normalized = normalizeTripPackingStatus(value);
  return normalized === "waiting_for_laundry" || normalized === "removed" ? "not_packed" : normalized;
}

function normalizeTripCapsuleStatus(value: string | null | undefined): TripCapsuleStatus {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "confirmed";
  if (TRIP_CAPSULE_STATUS_OPTIONS.includes(normalized as TripCapsuleStatus)) {
    return normalized as TripCapsuleStatus;
  }
  return "confirmed";
}

function normalizeTripLookStatus(value: string | null | undefined): TripLookStatus {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "active";
  if (TRIP_LOOK_STATUS_OPTIONS.includes(normalized as TripLookStatus)) {
    return normalized as TripLookStatus;
  }
  return "active";
}

function normalizeTripWardrobeItemSource(value: string | null | undefined): TripWardrobeItem["source"] {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "manual" || normalized === "to_buy") return normalized;
  return "outfit";
}

function normalizeEssentialInclusionType(
  value: string | null | undefined,
): EssentialLibraryItem["inclusion_type"] {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "always_include" || normalized === "optional") return normalized;
  return "usually_include";
}

function normalizeTripEssentialInclusionType(
  value: string | null | undefined,
): TripEssentialItem["inclusion_type"] {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === "always_include" ||
    normalized === "usually_include" ||
    normalized === "optional" ||
    normalized === "trip_specific"
  ) {
    return normalized;
  }
  return "usually_include";
}

function normalizeBagAssignment(value: string | null | undefined): TripBagAssignment | null {
  return TRIP_BAG_ASSIGNMENT_OPTIONS.find((option) => option === value) ?? null;
}

function normalizeLuggageType(value: string | null | undefined): Trip["luggage_type"] {
  return TRIP_LUGGAGE_TYPE_OPTIONS.find((option) => option === value) ?? null;
}

function normalizeTripItemReturnStatus(value: string | null | undefined): TripItemReturnStatus {
  const normalized = value?.trim().toLowerCase();
  if (TRIP_RETURN_STATUS_OPTIONS.includes(normalized as TripItemReturnStatus)) {
    return normalized as TripItemReturnStatus;
  }
  return "returned_to_wardrobe";
}
