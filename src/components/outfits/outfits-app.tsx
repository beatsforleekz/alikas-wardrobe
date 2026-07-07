"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { CollectionNav } from "@/components/navigation/collection-nav";
import { OutfitBuilderPanel } from "@/components/outfits/outfit-builder-panel";
import { OutfitCard } from "@/components/outfits/outfit-card";
import { BrandedLoadingScreen } from "@/components/ui/branded-loading-screen";
import { EmptyState } from "@/components/ui/empty-state";
import { createOutfit, deleteOutfit, getOutfits, updateOutfit } from "@/lib/data/outfits";
import { getInventoryItems } from "@/lib/data/inventory";
import { hasUnavailableOutfitItems, validateOutfit } from "@/lib/outfits";
import { useWardrobeSession } from "@/hooks/use-wardrobe-session";
import type { InventoryItem } from "@/types/inventory";
import type { Outfit, OutfitInput } from "@/types/outfit";

const OUTFITS_VIEW_STATE_KEY = "alikas-wardrobe:outfits-view-state";
const OUTFITS_SCROLL_KEY = "alikas-wardrobe:outfits-scroll";

type OutfitSortOption = "az" | "za" | "most_recent" | "oldest";

export function OutfitsApp() {
  const { supabase, session, isSessionLoading, handleLogin } = useWardrobeSession();
  const router = useRouter();
  const savedState = useMemo(() => getStoredOutfitsViewState(), []);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [query, setQuery] = useState(savedState?.query ?? "");
  const [sortBy, setSortBy] = useState<OutfitSortOption>(savedState?.sortBy ?? "az");
  const [availabilityFilter, setAvailabilityFilter] = useState<
    "" | "complete" | "incomplete" | "has_unavailable_items"
  >("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<Outfit | null>(null);
  const [notice, setNotice] = useState("");
  const [pendingEditOutfitId, setPendingEditOutfitId] = useState("");

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(
      OUTFITS_VIEW_STATE_KEY,
        JSON.stringify({
          query,
          sortBy,
        }),
    );
  }, [query, sortBy]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const restoreScroll = () => {
      const rawValue = window.sessionStorage.getItem(OUTFITS_SCROLL_KEY);
      const scrollY = rawValue ? Number(rawValue) : 0;

      if (Number.isFinite(scrollY) && scrollY > 0) {
        window.scrollTo({ top: scrollY, behavior: "auto" });
      }
    };

    const animationFrame = window.requestAnimationFrame(restoreScroll);
    const handleScroll = () => {
      window.sessionStorage.setItem(OUTFITS_SCROLL_KEY, `${window.scrollY}`);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      handleScroll();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const requestedEditId = params.get("edit") ?? "";

    if (requestedEditId) {
      setPendingEditOutfitId(requestedEditId);
    }
  }, []);

  const validatedOutfits = useMemo(
    () => outfits.map((outfit) => validateOutfit(outfit, inventoryItems)),
    [inventoryItems, outfits],
  );

  useEffect(() => {
    if (!pendingEditOutfitId || outfits.length === 0) {
      return;
    }

    const targetOutfit = outfits.find((outfit) => outfit.id === pendingEditOutfitId);

    if (!targetOutfit) {
      return;
    }

    setEditingOutfit(targetOutfit);
    setBuilderOpen(true);
    setPendingEditOutfitId("");
    router.replace("/outfits", { scroll: false });
  }, [outfits, pendingEditOutfitId, router]);

  const filteredOutfits = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = validatedOutfits.filter((entry) => {
      const fields = [
        entry.outfit.title,
        entry.outfit.occasion,
        entry.outfit.trip,
        entry.outfit.capsule,
        entry.outfit.item_ids.join(" "),
        entry.outfit.tags.join(" "),
      ];

      const matchesQuery =
        !normalizedQuery ||
        fields.some((field) => field?.toLowerCase().includes(normalizedQuery));
      const hasUnavailableItems = hasUnavailableOutfitItems(entry);
      const isIncomplete = hasUnavailableItems;
      const matchesAvailability =
        !availabilityFilter ||
        (availabilityFilter === "complete" && !isIncomplete) ||
        (availabilityFilter === "incomplete" && isIncomplete) ||
        (availabilityFilter === "has_unavailable_items" && hasUnavailableItems);

      return matchesQuery && matchesAvailability;
    });

    return [...filtered].sort((left, right) => {
      const leftTitle = (left.outfit.title || "").trim().toLowerCase();
      const rightTitle = (right.outfit.title || "").trim().toLowerCase();
      const leftCreatedAt = left.outfit.created_at ?? "";
      const rightCreatedAt = right.outfit.created_at ?? "";

      if (sortBy === "most_recent") {
        return rightCreatedAt.localeCompare(leftCreatedAt) || leftTitle.localeCompare(rightTitle);
      }

      if (sortBy === "oldest") {
        return leftCreatedAt.localeCompare(rightCreatedAt) || leftTitle.localeCompare(rightTitle);
      }

      if (sortBy === "za") {
        return rightTitle.localeCompare(leftTitle) || rightCreatedAt.localeCompare(leftCreatedAt);
      }

      return leftTitle.localeCompare(rightTitle) || rightCreatedAt.localeCompare(leftCreatedAt);
    });
  }, [availabilityFilter, query, sortBy, validatedOutfits]);

  async function handleSaveOutfit(input: OutfitInput, currentId?: string) {
    if (!session) {
      return;
    }

    if (currentId) {
      const updated = await updateOutfit(supabase, currentId, input);
      setOutfits((current) =>
        current
          .map((outfit) => (outfit.id === currentId ? updated : outfit))
          .sort((left, right) => (right.created_at ?? "").localeCompare(left.created_at ?? "")),
      );
      setNotice(`${updated.title} updated.`);
      return;
    }

    const created = await createOutfit(supabase, session.user.id, input);
    setOutfits((current) =>
      [created, ...current].sort((left, right) => (right.created_at ?? "").localeCompare(left.created_at ?? "")),
    );
    setNotice(`${created.title} added to lookbooks.`);
  }

  async function handleDeleteOutfit(outfitToDelete: Outfit) {
    await deleteOutfit(supabase, outfitToDelete.id);
    setOutfits((current) => current.filter((entry) => entry.id !== outfitToDelete.id));
    setNotice(`${outfitToDelete.title} deleted.`);
  }

  if (isSessionLoading) {
    return <BrandedLoadingScreen title="Preparing your lookbook" />;
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
        <BrandedLoadingScreen title="Preparing your lookbook" />
      ) : (
        <section className="dashboard dashboard-tight">
          <div className="results-bar inventory-overview">
            <div className="results-copy">
              <p className="results-heading">Editorial outfits</p>
              <p>
                Showing {filteredOutfits.length} of {validatedOutfits.length} lookbooks.
              </p>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setEditingOutfit(null);
                setBuilderOpen(true);
              }}
            >
              New outfit
            </button>
          </div>

          {notice ? <p className="inline-notice">{notice}</p> : null}

          <div className="dashboard-card">
            <div className="search-panel search-panel-compact">
              <label className="search-label" htmlFor="lookbook-search">
                Search by title, occasion, trip, tags, or linked item ID
              </label>
              <input
                id="lookbook-search"
                className="search-input"
                type="search"
                value={query}
                placeholder="Search lookbooks"
                onChange={(event) => setQuery(event.target.value)}
              />
              <label className="field">
                <span>Availability</span>
                <select
                  className="filter-select"
                  value={availabilityFilter}
                  onChange={(event) =>
                    setAvailabilityFilter(
                      event.target.value as "" | "complete" | "incomplete" | "has_unavailable_items",
                    )
                  }
                >
                  <option value="">All lookbooks</option>
                  <option value="complete">Complete</option>
                  <option value="incomplete">Incomplete</option>
                  <option value="has_unavailable_items">Has unavailable items</option>
                </select>
              </label>
              <label className="field">
                <span>Sort</span>
                <select
                  className="filter-select"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as OutfitSortOption)}
                >
                  <option value="az">A-Z</option>
                  <option value="za">Z-A</option>
                  <option value="most_recent">Most recent</option>
                  <option value="oldest">Oldest</option>
                </select>
              </label>
            </div>
          </div>

          {validatedOutfits.length === 0 ? (
            <EmptyState
              title="No lookbooks yet"
              description="Create your first outfit lookbook and link it directly to your wardrobe items."
            />
          ) : filteredOutfits.length === 0 ? (
            <EmptyState
              title="No lookbooks match this search"
              description="Try another outfit name, occasion, trip, tag, or linked wardrobe item ID."
            />
          ) : (
            <div className="outfits-grid">
              {filteredOutfits.map((entry) => (
                <OutfitCard
                  key={entry.outfit.id}
                  entry={entry}
                  onEdit={() => {
                    setEditingOutfit(entry.outfit);
                    setBuilderOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <OutfitBuilderPanel
        open={builderOpen}
        outfit={editingOutfit}
        inventoryItems={inventoryItems}
        onClose={() => {
          setBuilderOpen(false);
          setEditingOutfit(null);
        }}
        onSubmit={handleSaveOutfit}
        onDelete={handleDeleteOutfit}
      />
    </main>
  );
}

function getStoredOutfitsViewState(): { query: string; sortBy: OutfitSortOption } | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(OUTFITS_VIEW_STATE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<{ query: string; sortBy: OutfitSortOption }>;

    return {
      query: typeof parsed.query === "string" ? parsed.query : "",
      sortBy:
        parsed.sortBy === "az" ||
        parsed.sortBy === "za" ||
        parsed.sortBy === "most_recent" ||
        parsed.sortBy === "oldest"
          ? parsed.sortBy
          : "az",
    };
  } catch {
    return null;
  }
}
