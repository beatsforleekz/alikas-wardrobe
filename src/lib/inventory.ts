import type { InventoryFilters, InventoryItem } from "@/types/inventory";

export function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
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

