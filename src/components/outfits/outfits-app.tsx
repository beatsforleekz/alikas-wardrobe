"use client";

import { useEffect, useMemo, useState } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { CollectionNav } from "@/components/navigation/collection-nav";
import { OutfitCard } from "@/components/outfits/outfit-card";
import { EmptyState } from "@/components/ui/empty-state";
import { getInventoryItems } from "@/lib/data/inventory";
import { getOutfits } from "@/lib/data/outfits";
import { validateOutfit } from "@/lib/outfits";
import { useWardrobeSession } from "@/hooks/use-wardrobe-session";
import type { InventoryItem } from "@/types/inventory";
import type { Outfit } from "@/types/outfit";

export function OutfitsApp() {
  const { supabase, session, isSessionLoading, handleLogin } = useWardrobeSession();
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadData() {
      if (!session) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const [nextOutfits, nextInventory] = await Promise.all([
          getOutfits(supabase),
          getInventoryItems(supabase),
        ]);

        if (isActive) {
          setOutfits(nextOutfits);
          setInventoryItems(nextInventory);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load outfits.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isActive = false;
    };
  }, [session, supabase]);

  const validatedOutfits = useMemo(
    () => outfits.map((outfit) => validateOutfit(outfit, inventoryItems)),
    [inventoryItems, outfits],
  );
  const filteredOutfits = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return validatedOutfits;
    }

    return validatedOutfits.filter((entry) => {
      const fields = [
        entry.outfit.title,
        entry.outfit.occasion,
        entry.outfit.capsule,
        entry.outfit.item_ids.join(" "),
        entry.outfit.tags.join(" "),
      ];

      return fields.some((field) => field?.toLowerCase().includes(normalizedQuery));
    });
  }, [query, validatedOutfits]);

  if (isSessionLoading) {
    return <CollectionLoadingScreen title="Preparing your lookbooks" message="Checking your wardrobe session..." />;
  }

  if (!session) {
    return <LoginForm onSubmit={handleLogin} />;
  }

  return (
    <main className="page-shell">
      <CollectionNav />

      <header className="page-header">
        <h1 className="page-title">Lookbooks</h1>
      </header>

      {errorMessage ? (
        <section className="dashboard">
          <EmptyState title="Could not load outfits" description={errorMessage} />
        </section>
      ) : isLoading ? (
        <CollectionLoadingScreen
          title="Fetching lookbooks"
          message="Loading outfits and validating their wardrobe links."
        />
      ) : validatedOutfits.length === 0 ? (
        <section className="dashboard">
          <EmptyState
            title="No lookbooks yet"
            description="Outfit data has not been populated in Supabase yet. Once outfits are added, they will appear here with wardrobe-link validation."
          />
        </section>
      ) : (
        <section className="dashboard dashboard-tight">
          <div className="dashboard-card">
            <div className="search-panel search-panel-compact">
              <label className="search-label" htmlFor="lookbook-search">
                Search by title, occasion, capsule, tags, or linked item ID
              </label>
              <input
                id="lookbook-search"
                className="search-input"
                type="search"
                value={query}
                placeholder="Search lookbooks"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          <div className="results-bar inventory-overview">
            <div className="results-copy">
              <p className="results-heading">Editorial outfits</p>
              <p>
                Showing {filteredOutfits.length} of {validatedOutfits.length} lookbooks.
              </p>
            </div>
          </div>

          {filteredOutfits.length === 0 ? (
            <EmptyState
              title="No lookbooks match this search"
              description="Try another outfit name, occasion, capsule, tag, or linked wardrobe item ID."
            />
          ) : (
            <div className="outfits-grid">
              {filteredOutfits.map((entry) => (
                <OutfitCard key={entry.outfit.id} entry={entry} />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function CollectionLoadingScreen({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="page-shell">
      <section className="setup-notice">
        <p className="eyebrow">Loading</p>
        <h1>{title}</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}
