"use client";

import { useEffect, useMemo, useState } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { CollectionNav } from "@/components/navigation/collection-nav";
import { EmptyState } from "@/components/ui/empty-state";
import { useWardrobeSession } from "@/hooks/use-wardrobe-session";
import { getCatalogueStorageBucket, hasCatalogueStorage } from "@/lib/env";

const CATALOGUE_SETTINGS_KEY = "alikas-wardrobe:catalogue-settings";

type CatalogueSettings = {
  sourceType: "url" | "storage";
  url: string;
  storagePath: string;
  fileName: string;
  fileUrl: string;
};

const defaultSettings: CatalogueSettings = {
  sourceType: "url",
  url: "",
  storagePath: "",
  fileName: "",
  fileUrl: "",
};

export function CatalogueApp() {
  const { session, isSessionLoading, handleLogin, supabase } = useWardrobeSession();
  const storageEnabled = hasCatalogueStorage();
  const bucketName = getCatalogueStorageBucket();
  const [settings, setSettings] = useState<CatalogueSettings>(defaultSettings);
  const [draftUrl, setDraftUrl] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = getStoredCatalogueSettings();
    setSettings(stored);
    setDraftUrl(stored.sourceType === "url" ? stored.url : "");
  }, []);

  const activeCatalogueUrl = useMemo(
    () => (settings.sourceType === "storage" ? settings.fileUrl : settings.url),
    [settings],
  );

  if (isSessionLoading) {
    return (
      <main className="page-shell">
        <section className="setup-notice">
          <p className="eyebrow">Loading</p>
          <h1>Preparing your catalogue</h1>
          <p>Checking your wardrobe session before opening catalogue access.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return <LoginForm onSubmit={handleLogin} />;
  }

  const sessionUserId = session.user.id;

  function persist(nextSettings: CatalogueSettings) {
    setSettings(nextSettings);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CATALOGUE_SETTINGS_KEY, JSON.stringify(nextSettings));
    }
  }

  function handleSaveUrl() {
    const trimmed = draftUrl.trim();
    const nextSettings: CatalogueSettings = {
      sourceType: "url",
      url: trimmed,
      storagePath: "",
      fileName: "",
      fileUrl: trimmed,
    };

    persist(nextSettings);
    setStatusMessage(trimmed ? "Catalogue link saved." : "Catalogue link cleared.");
  }

  function handleClear() {
    persist(defaultSettings);
    setDraftUrl("");
    setStatusMessage("Catalogue entry cleared.");
  }

  async function handleCopy() {
    if (!activeCatalogueUrl) {
      return;
    }

    await navigator.clipboard.writeText(activeCatalogueUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.type !== "application/pdf") {
      setStatusMessage("Only PDF files are accepted for the wardrobe catalogue.");
      event.target.value = "";
      return;
    }

    if (!storageEnabled || !bucketName) {
      setStatusMessage("Catalogue upload is not configured yet.");
      event.target.value = "";
      return;
    }

    setIsUploading(true);
    setStatusMessage("");

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${sessionUserId}/catalogue-${Date.now()}-${safeName.endsWith(`.${extension}`) ? safeName : `${safeName}.${extension}`}`;

      const uploadResult = await supabase.storage
        .from(bucketName)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: "application/pdf",
        });

      if (uploadResult.error) {
        throw new Error(uploadResult.error.message);
      }

      const signedResult = await supabase.storage
        .from(bucketName)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

      if (signedResult.error) {
        throw new Error(signedResult.error.message);
      }

      const nextSettings: CatalogueSettings = {
        sourceType: "storage",
        url: "",
        storagePath,
        fileName: file.name,
        fileUrl: signedResult.data.signedUrl,
      };

      persist(nextSettings);
      setDraftUrl("");
      setStatusMessage("Wardrobe Catalogue PDF uploaded and saved.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to upload the wardrobe catalogue right now.",
      );
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  const hasSavedCatalogue = Boolean(activeCatalogueUrl);

  return (
    <main className="page-shell">
      <CollectionNav />

      <header className="page-header">
        <h1 className="page-title">Catalogue</h1>
      </header>

      <section className="dashboard dashboard-tight">
        <article className="detail-card catalogue-card">
          <div className="results-copy">
            <p className="results-heading">Wardrobe catalogue access</p>
            <p>Keep the current wardrobe catalogue close to the lookbook workflow.</p>
          </div>

          <div className="catalogue-section">
            <label className="field">
              <span>Catalogue PDF URL</span>
              <input
                className="text-input"
                type="url"
                value={draftUrl}
                placeholder="https://..."
                onChange={(event) => setDraftUrl(event.target.value)}
              />
            </label>
            <p className="catalogue-helper">
              Use a public link from Dropbox, Google Drive, Supabase Storage, or another hosted
              file. Local files cannot be linked until uploaded.
            </p>
            <div className="catalogue-actions">
              <button type="button" className="primary-button" onClick={handleSaveUrl}>
                {settings.sourceType === "url" && settings.url ? "Replace catalogue URL" : "Save catalogue URL"}
              </button>
            </div>
          </div>

          <div className="catalogue-section">
            <div className="results-copy">
              <p className="results-heading">Wardrobe Catalogue PDF</p>
              <p>Upload the current catalogue PDF when storage is configured.</p>
            </div>

            {storageEnabled ? (
              <div className="catalogue-upload-row">
                <label className="ghost-button catalogue-upload-button">
                  {isUploading
                    ? "Uploading..."
                    : settings.sourceType === "storage"
                      ? "Replace Catalogue"
                      : "Upload Catalogue"}
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleUpload}
                    disabled={isUploading}
                    hidden
                  />
                </label>
                <p className="catalogue-helper">Accepted file type: PDF.</p>
              </div>
            ) : (
              <div className="catalogue-upload-disabled">
                <button type="button" className="ghost-button" disabled>
                  Upload Catalogue Coming Soon
                </button>
                <p className="catalogue-helper">
                  Supabase Storage upload becomes available once
                  `NEXT_PUBLIC_SUPABASE_CATALOGUE_BUCKET` is configured and the bucket/policies are set up.
                </p>
              </div>
            )}
          </div>

          {hasSavedCatalogue ? (
            <div className="catalogue-saved">
              <p className="sku-label">Current catalogue</p>
              <p className="catalogue-saved-name">
                {settings.sourceType === "storage"
                  ? settings.fileName || "Wardrobe Catalogue PDF"
                  : activeCatalogueUrl}
              </p>
              <div className="catalogue-actions">
                <a
                  className="primary-button catalogue-open-link"
                  href={activeCatalogueUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Catalogue
                </a>
                <button type="button" className="ghost-button" onClick={handleCopy}>
                  {copied ? "Copied" : "Copy link"}
                </button>
                <button type="button" className="ghost-button" onClick={handleClear}>
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <EmptyState
              compact
              title="No catalogue saved yet"
              description="Add a hosted URL or upload a wardrobe catalogue PDF so it is ready when generating lookbook prompts."
            />
          )}

          {statusMessage ? <p className="catalogue-helper">{statusMessage}</p> : null}
        </article>
      </section>
    </main>
  );
}

function getStoredCatalogueSettings(): CatalogueSettings {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const rawValue = window.localStorage.getItem(CATALOGUE_SETTINGS_KEY);
    if (!rawValue) {
      return defaultSettings;
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
    return defaultSettings;
  }
}
