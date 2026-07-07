import type {
  EssentialLibraryItem,
  EssentialLibraryItemInput,
  Trip,
  TripInput,
  TripLookCategory,
  TripOutfitLink,
  TripPackingStatus,
  TripStatus,
  TripWardrobeItem,
  TripWardrobeItemOutfitLink,
  TripEssentialItem,
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
  notes: string | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export const TRIP_STATUS_OPTIONS: TripStatus[] = ["draft", "active", "complete", "archived"];
export const TRIP_PACKING_STATUS_OPTIONS: TripPackingStatus[] = [
  "pending",
  "packed",
  "not_required",
  "missing",
];
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
    source: row.source === "manual" ? "manual" : "outfit",
    packing_status: normalizeTripPackingStatus(row.packing_status),
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

export function normalizeEssentialLibraryItemRecord(
  row: EssentialLibraryItemRow,
): EssentialLibraryItem {
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
    packing_status: normalizeTripPackingStatus(row.packing_status),
    notes: row.notes?.trim() || null,
    sort_order: row.sort_order ?? 0,
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

  if (start && end) {
    return `${start} - ${end}`;
  }

  return start || end || "Dates to be decided";
}

export function isPackingStatusResolved(status: TripPackingStatus) {
  return status === "packed" || status === "not_required";
}

export function isEssentialRequired(
  inclusionType: EssentialLibraryItem["inclusion_type"] | TripEssentialItem["inclusion_type"],
) {
  return inclusionType !== "optional";
}

export function formatPackingStatusLabel(status: TripPackingStatus) {
  switch (status) {
    case "packed":
      return "Packed";
    case "not_required":
      return "Not required";
    case "missing":
      return "Missing";
    default:
      return "Pending";
  }
}

export function formatTripStatus(status: TripStatus) {
  switch (status) {
    case "active":
      return "Active";
    case "complete":
      return "Complete";
    case "archived":
      return "Archived";
    default:
      return "Draft";
  }
}

export function formatEssentialInclusionType(
  value: EssentialLibraryItem["inclusion_type"] | TripEssentialItem["inclusion_type"],
) {
  switch (value) {
    case "always_include":
      return "Always Include";
    case "optional":
      return "Optional";
    case "trip_specific":
      return "Trip Specific";
    default:
      return "Usually Include";
  }
}

export function getTripDurationLabel(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) {
    return null;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const ms = end.getTime() - start.getTime();

  if (Number.isNaN(ms) || ms < 0) {
    return null;
  }

  const days = Math.floor(ms / 86400000) + 1;

  return `${days} day${days === 1 ? "" : "s"}`;
}

function normalizeTripStatus(value: string | null | undefined): TripStatus {
  if (value === "active" || value === "complete" || value === "archived") {
    return value;
  }

  return "draft";
}

function normalizeTripPackingStatus(value: string | null | undefined): TripPackingStatus {
  if (value === "packed" || value === "not_required" || value === "missing") {
    return value;
  }

  return "pending";
}

function normalizeEssentialInclusionType(
  value: string | null | undefined,
): EssentialLibraryItem["inclusion_type"] {
  if (value === "always_include" || value === "optional") {
    return value;
  }

  return "usually_include";
}

function normalizeTripEssentialInclusionType(
  value: string | null | undefined,
): TripEssentialItem["inclusion_type"] {
  if (
    value === "always_include" ||
    value === "optional" ||
    value === "trip_specific"
  ) {
    return value;
  }

  return "usually_include";
}

function nullableValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}
