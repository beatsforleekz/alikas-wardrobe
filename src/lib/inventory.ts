import type {
  InventoryFilters,
  InventoryItem,
  InventoryItemInput,
} from "@/types/inventory";

export const INVENTORY_STATUS_OPTIONS = [
  "Available",
  "In Laundry",
  "Packed",
  "Archived",
  "Discarded",
] as const;

export const TRAVEL_FRIENDLY_OPTIONS = ["Yes", "No"] as const;

export const EMPTY_INVENTORY_ITEM_INPUT: InventoryItemInput = {
  item_id: "",
  category: "",
  item_name: "",
  colour: "",
  status: "Available",
  silhouette: "",
  vibe: "",
  shoot_level: "",
  travel_friendly: "",
  notes: "",
  set_name: "",
  season: "",
  image: "",
  style_type: "",
  tags: "",
};

export function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function parseTags(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function normalizeTravelFriendly(value: string | boolean | null | undefined) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  const normalized = normalizeText(value);

  if (["true", "yes", "y"].includes(normalized)) {
    return "Yes";
  }

  if (["false", "no", "n"].includes(normalized)) {
    return "No";
  }

  return "";
}

export function formatValue(value: string | boolean | null | undefined) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  const normalizedTravel = normalizeTravelFriendly(value);
  if (normalizedTravel) {
    return normalizedTravel;
  }

  const trimmed = value?.trim();
  return trimmed ? trimmed : "Not provided";
}

export function normalizeInventoryItemInput(item: InventoryItem): InventoryItemInput {
  return {
    item_id: item.item_id,
    category: item.category ?? "",
    item_name: item.item_name ?? "",
    colour: item.colour ?? "",
    status: item.status ?? "Available",
    silhouette: item.silhouette ?? "",
    vibe: item.vibe ?? "",
    shoot_level: item.shoot_level ?? "",
    travel_friendly: normalizeTravelFriendly(item.travel_friendly),
    notes: item.notes ?? "",
    set_name: item.set_name ?? "",
    season: item.season ?? "",
    image: item.image ?? "",
    style_type: item.style_type ?? "",
    tags: item.tags ?? "",
  };
}

export function sanitizeInventoryItemInput(input: InventoryItemInput) {
  return {
    item_id: input.item_id.trim().toUpperCase(),
    category: nullableValue(input.category),
    item_name: nullableValue(input.item_name),
    colour: nullableValue(input.colour),
    status: nullableValue(input.status),
    silhouette: nullableValue(input.silhouette),
    vibe: nullableValue(input.vibe),
    shoot_level: nullableValue(input.shoot_level),
    travel_friendly: nullableValue(normalizeTravelFriendly(input.travel_friendly)),
    notes: nullableValue(input.notes),
    set_name: nullableValue(input.set_name),
    season: nullableValue(input.season),
    image: nullableValue(input.image),
    style_type: nullableValue(input.style_type),
    tags: nullableValue(
      parseTags(input.tags)
        .filter((tag, index, tags) => tags.indexOf(tag) === index)
        .join(", "),
    ),
  };
}

export function validateInventoryItemInput(
  input: InventoryItemInput,
  existingItems: InventoryItem[],
  options: {
    categories: string[];
    statuses?: string[];
  },
  currentItemId?: string,
) {
  const errors: string[] = [];
  const normalizedItemId = input.item_id.trim().toUpperCase();

  if (!normalizedItemId) {
    errors.push("Item ID is required.");
  }

  if (!input.item_name.trim()) {
    errors.push("Item name is required.");
  }

  if (!input.category.trim()) {
    errors.push("Category is required.");
  } else if (
    options.categories.length > 0 &&
    !options.categories.some((category) => normalizeText(category) === normalizeText(input.category))
  ) {
    errors.push("Category must match an existing wardrobe category.");
  }

  if (!input.status.trim()) {
    errors.push("Status is required.");
  } else {
    const statuses = options.statuses ?? [...INVENTORY_STATUS_OPTIONS];
    if (!statuses.some((status) => normalizeText(status) === normalizeText(input.status))) {
      errors.push("Status must be one of the supported wardrobe statuses.");
    }
  }

  if (
    normalizedItemId &&
    existingItems.some(
      (item) =>
        item.item_id.trim().toUpperCase() === normalizedItemId &&
        item.item_id.trim().toUpperCase() !== currentItemId?.trim().toUpperCase(),
    )
  ) {
    errors.push("This item ID already exists. Choose a unique item ID.");
  }

  if (input.image.trim() && !isLikelyUrl(input.image)) {
    errors.push("Image must be a valid URL.");
  }

  return errors;
}

export function getDisplayImage(image: string | null) {
  const trimmed = image?.trim();
  return trimmed ? trimmed : null;
}

export function buildFilterOptions(items: InventoryItem[]) {
  return {
    categories: uniqueValues(items.map((item) => item.category)),
    statuses: uniqueValues(items.map((item) => item.status)),
    seasons: uniqueValues(items.map((item) => item.season)),
    styleTypes: uniqueValues(items.map((item) => item.style_type)),
    travelFriendly: uniqueValues(items.map((item) => normalizeTravelFriendly(item.travel_friendly))),
  };
}

export function filterInventoryItems(items: InventoryItem[], filters: InventoryFilters) {
  const query = normalizeText(filters.query);

  return items.filter((item) => {
    const searchFields = [
      item.item_id,
      item.item_name,
      item.colour,
      item.category,
      item.tags,
      item.vibe,
    ];

    const matchesQuery =
      !query ||
      searchFields.some((field) => normalizeText(field).includes(query));

    const matchesCategory =
      !filters.category || normalizeText(item.category) === normalizeText(filters.category);

    const matchesStatus =
      !filters.status || normalizeText(item.status) === normalizeText(filters.status);

    const matchesSeason =
      !filters.season || normalizeText(item.season) === normalizeText(filters.season);

    const matchesStyleType =
      !filters.style_type ||
      normalizeText(item.style_type) === normalizeText(filters.style_type);

    const matchesTravelFriendly =
      !filters.travel_friendly ||
      normalizeTravelFriendly(item.travel_friendly) === filters.travel_friendly;

    return (
      matchesQuery &&
      matchesCategory &&
      matchesStatus &&
      matchesSeason &&
      matchesStyleType &&
      matchesTravelFriendly
    );
  });
}

export function sortInventoryItems(items: InventoryItem[]) {
  return [...items].sort((left, right) => left.item_id.localeCompare(right.item_id));
}

export function getCategorySummary(items: InventoryItem[]) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const key = item.category?.trim() || "Uncategorised";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

export function getStatusTone(status: string) {
  const normalized = normalizeText(status);

  if (normalized === "available") {
    return "status-available";
  }

  if (normalized === "in laundry" || normalized === "packed") {
    return `status-${normalized.replace(/\s+/g, "-")}`;
  }

  if (normalized === "archived" || normalized === "discarded") {
    return `status-${normalized}`;
  }

  return "status-default";
}

function uniqueValues(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean))] as string[];
}

function nullableValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isLikelyUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}
