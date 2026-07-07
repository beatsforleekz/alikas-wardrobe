export const CATALOGUE_SETTINGS_KEY = "alikas-wardrobe:catalogue-settings";

export type CatalogueSettings = {
  sourceType: "url" | "storage";
  url: string;
  storagePath: string;
  fileName: string;
  fileUrl: string;
};

export const defaultCatalogueSettings: CatalogueSettings = {
  sourceType: "url",
  url: "",
  storagePath: "",
  fileName: "",
  fileUrl: "",
};

export function getStoredCatalogueSettings(): CatalogueSettings {
  if (typeof window === "undefined") {
    return defaultCatalogueSettings;
  }

  try {
    const rawValue = window.localStorage.getItem(CATALOGUE_SETTINGS_KEY);
    if (!rawValue) {
      return defaultCatalogueSettings;
    }

    const parsed = JSON.parse(rawValue) as Partial<CatalogueSettings>;
    return {
      sourceType: parsed.sourceType === "storage" ? "storage" : "url",
      url: parsed.url ?? "",
      storagePath: parsed.storagePath ?? "",
      fileName: parsed.fileName ?? "",
      fileUrl: parsed.fileUrl ?? "",
    };
  } catch {
    return defaultCatalogueSettings;
  }
}

export function getActiveCatalogueUrl(settings: CatalogueSettings) {
  return settings.sourceType === "storage" ? settings.fileUrl : settings.url;
}

export function isLikelyPdfUrl(value: string) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      url.pathname.toLowerCase().endsWith(".pdf") ||
      url.search.toLowerCase().includes(".pdf") ||
      url.hostname.includes("supabase")
    );
  } catch {
    return false;
  }
}

export function getCatalogueEmbedUrl(value: string) {
  return value.trim();
}
