import type { InventoryItem } from "@/types/inventory";
import type {
  LookbookPromptResult,
  Outfit,
  OutfitItemValidationStatus,
  OutfitInput,
  OutfitLinkedItem,
  ValidatedOutfit,
} from "@/types/outfit";
import { isUnavailableInventoryStatus } from "@/lib/inventory";

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

export const EMPTY_OUTFIT_INPUT: OutfitInput = {
  title: "",
  occasion: "",
  trip: "",
  coverImage: "",
  notes: "",
  tags: "",
  item_ids: [],
};

export const OUTFIT_GROUP_LABELS = [
  "Hair",
  "Hat",
  "Top",
  "Dress / One Piece",
  "Bottom / Skirt / Shorts",
  "Shoes",
  "Bag",
  "Accessories",
  "Cover Up",
  "Swimwear",
] as const;

export function normalizeOutfitRecord(row: OutfitRow): Outfit {
  const tags = parseTagString(row.tags);

  return {
    id: row.id,
    user_id: row.user_id,
    title: row.name?.trim() || "Untitled outfit",
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
    occasion: row.occasion?.trim() || null,
    tags,
    capsule: tags.length ? tags.join(" • ") : null,
    trip: row.trip?.trim() || null,
    item_ids: parseStringArray(row.item_ids),
    lookbook_urls: parseStringArray(row.lookbook_urls),
  };
}

export function validateOutfit(outfit: Outfit, inventoryItems: InventoryItem[]): ValidatedOutfit {
  const inventoryMap = new Map(inventoryItems.map((item) => [item.item_id, item]));
  const duplicateCounts = new Map<string, number>();

  outfit.item_ids.forEach((itemId) => {
    duplicateCounts.set(itemId, (duplicateCounts.get(itemId) ?? 0) + 1);
  });

  const linkedItems = outfit.item_ids.map((itemId) =>
    buildLinkedItem(itemId, inventoryMap.get(itemId) ?? null, duplicateCounts.get(itemId) ?? 0),
  );

  return {
    outfit,
    linkedItems,
    linkedItemCount: linkedItems.length,
    missingItemCount: linkedItems.filter((item) => item.status === "missing_item").length,
    needsReviewCount: linkedItems.filter((item) => item.status === "needs_review").length,
    unavailableItemCount: linkedItems.filter((item) => item.status === "unavailable_item").length,
  };
}

export function buildValidatedOutfitFromInput(
  input: OutfitInput,
  inventoryItems: InventoryItem[],
): ValidatedOutfit {
  const draftOutfit: Outfit = {
    id: "draft-outfit",
    user_id: null,
    title: input.title.trim() || "Untitled outfit",
    notes: input.notes.trim() || null,
    created_at: null,
    updated_at: null,
    occasion: input.occasion.trim() || null,
    tags: parseTagString(input.tags),
    capsule: parseTagString(input.tags).length ? parseTagString(input.tags).join(" • ") : null,
    trip: input.trip.trim() || null,
    item_ids: input.item_ids,
    lookbook_urls: input.coverImage.trim() ? [input.coverImage.trim()] : [],
  };

  return validateOutfit(draftOutfit, inventoryItems);
}

export function groupOutfitItems(items: OutfitLinkedItem[]) {
  return OUTFIT_GROUP_LABELS
    .map((groupLabel) => ({
      groupLabel,
      items: items.filter((item) => item.groupLabel === groupLabel),
    }))
    .filter((group) => group.items.length > 0);
}

export function getOutfitDisplayImage(outfit: Outfit) {
  return outfit.lookbook_urls[0] ?? null;
}

export function generateLookbookPrompt(
  validatedOutfit: ValidatedOutfit,
  inventoryItems: InventoryItem[],
): LookbookPromptResult {
  if (validatedOutfit.linkedItems.length === 0) {
    return {
      canGenerate: false,
      prompt: "",
      reason: "Link at least one wardrobe item before generating a lookbook prompt.",
    };
  }

  const linkedItems = ensureDefaultHairReference(validatedOutfit.linkedItems, inventoryItems);

  const season = deriveSeasonLabel(linkedItems);
  const notes = validatedOutfit.outfit.notes?.trim() || "None provided";
  const occasion = validatedOutfit.outfit.occasion?.trim() || "Not specified";
  const trip = validatedOutfit.outfit.trip?.trim() || "Not specified";

  const wardrobeItemsSection = linkedItems
    .map((linkedItem) => {
      const inventoryItem = linkedItem.inventoryItem;
      const name = inventoryItem?.item_name?.trim() || "Missing wardrobe item";
      const category = inventoryItem?.category?.trim() || linkedItem.categoryLabel;
      const image = inventoryItem?.image?.trim();
      const statusNote =
        linkedItem.status === "confirmed"
          ? ""
          : linkedItem.status === "missing_item"
            ? "\nStatus:\nMissing Item"
            : linkedItem.status === "unavailable_item"
              ? `\nStatus:\n${linkedItem.availabilityStatus || "Unavailable"}`
            : "\nStatus:\nNeeds Review";
      const noteBlock = linkedItem.notes?.trim() ? `\nReference Note:\n${linkedItem.notes.trim()}` : "";

      return `${linkedItem.itemId} — ${name} — ${category}${statusNote}${noteBlock}\n\nImage:\n${
        image || "Missing or unclear reference image"
      }`;
    })
    .join("\n\n");

  const prompt = `Generate the agreed Alika's Wardrobe lookbook format for the following look.

This is a wardrobe lookbook mockup, not a fashion illustration.

Use the exact wardrobe items listed below. Do not substitute, approximate or invent garments.

Preserve colours, silhouettes, proportions and styling exactly unless explicitly instructed otherwise.

If any required reference image is missing or unclear, ask before generating rather than guessing.

--------------------------------------------------

LOOK DETAILS

Outfit:
${validatedOutfit.outfit.title}

Occasion:
${occasion}

Trip/Capsule:
${trip}

Season:
${season}

Notes:
${notes}

--------------------------------------------------

WARDROBE ITEMS

${wardrobeItemsSection}

--------------------------------------------------

MODEL INSTRUCTIONS

- Model should reflect Alika's likeness/features when a reference photo is supplied.
- Height: 5'4".
- Maintain realistic body proportions.
- Garments should fit naturally.
- Keep the outfit wearable and believable.
- Do not exaggerate body shape.

--------------------------------------------------

LOOKBOOK STYLE

Generate the agreed wardrobe lookbook format.

- Premium editorial presentation.
- Clean neutral background.
- Full body.
- Outfit clearly visible.
- Accurate garment proportions.
- Luxury fashion catalogue aesthetic.
- Realistic lighting.
- High resolution.
- Match the established lookbook style used throughout Alika's Wardrobe.

--------------------------------------------------

IMPORTANT

- Use the exact wardrobe items listed.
- Do not invent accessories.
- Do not change colours.
- Do not substitute similar garments.
- Do not replace wardrobe items with alternatives.
- Use the attached wardrobe catalogue and item images as visual reference.
- If any required reference image is missing or unclear, ask before generating rather than guessing.

--------------------------------------------------

TECHNICAL REQUIREMENTS

- Generate the prompt entirely from the linked outfit item IDs.
- Validate every linked item against the inventory table before generating.
- Include image URLs where available.
- If an item is marked Missing Item or Needs Review, clearly state this inside the prompt.
- If no linked wardrobe items exist, disable prompt generation and display a helpful message.
- Add one-click Copy Prompt functionality.
- Keep the UI minimal and consistent with the premium wardrobe aesthetic.`;

  return {
    canGenerate: true,
    prompt,
    reason: null,
  };
}

export function normalizeOutfitInput(outfit: Outfit): OutfitInput {
  return {
    title: outfit.title,
    occasion: outfit.occasion ?? "",
    trip: outfit.trip ?? "",
    coverImage: outfit.lookbook_urls[0] ?? "",
    notes: outfit.notes ?? "",
    tags: outfit.tags.join(", "),
    item_ids: outfit.item_ids,
  };
}

export function sanitizeOutfitInput(input: OutfitInput) {
  return {
    name: nullableValue(input.title),
    occasion: nullableValue(input.occasion),
    trip: nullableValue(input.trip),
    notes: nullableValue(input.notes),
    tags: nullableValue(
      parseTagString(input.tags)
        .filter((tag, index, tags) => tags.indexOf(tag) === index)
        .join(", "),
    ),
    item_ids: input.item_ids.map((itemId) => itemId.trim()).filter(Boolean),
    lookbook_urls: input.coverImage.trim() ? [input.coverImage.trim()] : [],
  };
}

export function validateOutfitInput(input: OutfitInput, inventoryItems: InventoryItem[]) {
  const errors: string[] = [];
  const inventoryIds = new Set(inventoryItems.map((item) => item.item_id.trim().toUpperCase()));
  const seen = new Set<string>();
  const duplicateIds = new Set<string>();

  if (!input.title.trim()) {
    errors.push("Outfit title is required.");
  }

  if (input.coverImage.trim() && !isLikelyUrl(input.coverImage)) {
    errors.push("Cover image must be a valid URL.");
  }

  if (input.item_ids.length === 0) {
    errors.push("Select at least one wardrobe item.");
  }

  input.item_ids.forEach((itemId) => {
    const normalizedId = itemId.trim().toUpperCase();

    if (!normalizedId) {
      return;
    }

    if (seen.has(normalizedId)) {
      duplicateIds.add(normalizedId);
    }

    seen.add(normalizedId);

    if (!inventoryIds.has(normalizedId)) {
      errors.push(`Linked item ${normalizedId} does not exist in the wardrobe inventory.`);
    }
  });

  if (duplicateIds.size > 0) {
    errors.push(
      `Duplicate linked item IDs are not allowed: ${[...duplicateIds].sort().join(", ")}.`,
    );
  }

  return errors;
}

function buildLinkedItem(
  itemId: string,
  inventoryItem: InventoryItem | null,
  duplicateCount: number,
): OutfitLinkedItem {
  if (!inventoryItem) {
    return {
      itemId,
      status: "missing_item",
      inventoryItem: null,
      categoryLabel: "Missing item",
      groupLabel: "Accessories",
      notes: "This item ID does not currently exist in the wardrobe inventory.",
      availabilityStatus: null,
    };
  }

  if (duplicateCount > 1) {
    return {
      itemId,
      status: "needs_review",
      inventoryItem,
      categoryLabel: inventoryItem.category?.trim() || "Uncategorised",
      groupLabel: getOutfitGroupLabel(inventoryItem),
      notes: "This item ID is linked more than once in the same outfit and should be reviewed.",
      availabilityStatus: inventoryItem.status ?? null,
    };
  }

  if (isUnavailableInventoryStatus(inventoryItem.status)) {
    return {
      itemId,
      status: "unavailable_item",
      inventoryItem,
      categoryLabel: inventoryItem.category?.trim() || "Uncategorised",
      groupLabel: getOutfitGroupLabel(inventoryItem),
      notes: "This item is no longer available in the active wardrobe.",
      availabilityStatus: inventoryItem.status ?? null,
    };
  }

  return {
    itemId,
    status: "confirmed",
    inventoryItem,
    categoryLabel: inventoryItem.category?.trim() || "Uncategorised",
    groupLabel: getOutfitGroupLabel(inventoryItem),
    notes: null,
    availabilityStatus: inventoryItem.status ?? null,
  };
}

function ensureDefaultHairReference(
  linkedItems: OutfitLinkedItem[],
  inventoryItems: InventoryItem[],
): OutfitLinkedItem[] {
  const hasHair = linkedItems.some((item) => item.groupLabel === "Hair");

  if (hasHair) {
    return linkedItems;
  }

  const defaultHair = linkedItems.find((item) => item.inventoryItem?.item_id === "HAIR_003");

  if (defaultHair) {
    return linkedItems;
  }

  const hairInventoryItem =
    inventoryItems.find((item) => item.item_id.trim().toUpperCase() === "HAIR_003") ?? null;

  if (hairInventoryItem) {
    return [
      ...linkedItems,
      {
        itemId: "HAIR_003",
        status: "confirmed" as OutfitItemValidationStatus,
        inventoryItem: hairInventoryItem,
        categoryLabel: hairInventoryItem.category?.trim() || "Hair",
        groupLabel: "Hair",
        notes: "Auto-added as the default hair reference for holiday lookbooks.",
        availabilityStatus: hairInventoryItem.status ?? null,
      },
    ];
  }

  return [
    ...linkedItems,
    {
      itemId: "HAIR_003",
      status: "missing_item" as OutfitItemValidationStatus,
      inventoryItem: null,
      categoryLabel: "Hair",
      groupLabel: "Hair",
      notes: "Auto-added default hair reference. HAIR_003 Whitney is not available in the current inventory data.",
      availabilityStatus: null,
    },
  ];
}

export function hasUnavailableOutfitItems(validatedOutfit: ValidatedOutfit) {
  return validatedOutfit.missingItemCount > 0 || validatedOutfit.unavailableItemCount > 0;
}

export function getOutfitIncompleteCount(validatedOutfit: ValidatedOutfit) {
  return validatedOutfit.missingItemCount + validatedOutfit.unavailableItemCount;
}

function deriveSeasonLabel(linkedItems: OutfitLinkedItem[]) {
  const seasons = linkedItems
    .map((item) => item.inventoryItem?.season?.trim())
    .filter(Boolean) as string[];

  const uniqueSeasons = [...new Set(seasons)];
  return uniqueSeasons.length > 0 ? uniqueSeasons.join(" / ") : "Not specified";
}

function getOutfitGroupLabel(item: InventoryItem) {
  const itemId = item.item_id.trim().toUpperCase();
  const category = item.category?.trim().toLowerCase() || "";

  if (itemId === "TOP_051") {
    return "Cover Up";
  }

  if (itemId === "COVERUP_001") {
    return "Bottom / Skirt / Shorts";
  }

  if (["dress", "set", "swim set"].includes(category)) {
    return "Dress / One Piece";
  }

  if (["top", "bodysuit", "outerwear"].includes(category)) {
    return "Top";
  }

  if (["bottoms", "bottom", "skirt", "shorts"].includes(category)) {
    return "Bottom / Skirt / Shorts";
  }

  if (["swimwear"].includes(category)) {
    return "Swimwear";
  }

  if (["cover up"].includes(category)) {
    return "Cover Up";
  }

  if (["shoes"].includes(category)) {
    return "Shoes";
  }

  if (["bag"].includes(category)) {
    return "Bag";
  }

  if (["hats", "hat"].includes(category)) {
    return "Hat";
  }

  if (["hair"].includes(category)) {
    return "Hair";
  }

  return "Accessories";
}

function parseTagString(value: string | null) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
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

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((entry) => `${entry}`.trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => `${entry}`.trim()).filter(Boolean);
      }
    } catch {
      return trimmed
        .split(",")
        .map((entry) => entry.replace(/[[\]"]/g, "").trim())
        .filter(Boolean);
    }
  }

  return [];
}
