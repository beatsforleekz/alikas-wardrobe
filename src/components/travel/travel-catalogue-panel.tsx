"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { getActiveCatalogueUrl, getStoredCatalogueSettings, type CatalogueSettings } from "@/lib/catalogue";

export function TravelCataloguePanel({
  mode = "default",
}: {
  mode?: "default" | "hub" | "summary";
}) {
  const [settings, setSettings] = useState<CatalogueSettings | null>(null);

  useEffect(() => {
    setSettings(getStoredCatalogueSettings());
  }, []);

  const activeCatalogueUrl = useMemo(
    () => (settings ? getActiveCatalogueUrl(settings) : ""),
    [settings],
  );

  return (
    <article className="detail-card travel-catalogue-card">
      <div className="results-bar">
        <div className="results-copy">
          <p className="results-heading">Catalogue capsule</p>
          <p>Keep the wardrobe catalogue close while planning trips and refining packing.</p>
        </div>
        <Link className="ghost-button outfit-inline-action" href="/catalogue">
          {mode === "summary" ? "Open catalogue settings" : "Manage catalogue"}
        </Link>
      </div>

      {activeCatalogueUrl ? (
        <div className="travel-catalogue-actions">
          <p className="catalogue-saved-name">
            {settings?.sourceType === "storage"
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
              Open catalogue
            </a>
            <Link className="ghost-button" href="/catalogue">
              Replace
            </Link>
            <Link className="ghost-button" href="/catalogue">
              Link Existing
            </Link>
          </div>
        </div>
      ) : (
        <div className="travel-catalogue-actions">
          <p className="detail-description">
            No wardrobe catalogue is linked yet. Add the latest PDF on the Catalogue page so it travels with this planning flow.
          </p>
          <div className="catalogue-actions">
            <Link className="primary-button" href="/catalogue">
              Create Capsule
            </Link>
            <Link className="ghost-button" href="/catalogue">
              Link Capsule
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}
