"use client";

import { useEffect, useMemo, useState } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { CollectionNav } from "@/components/navigation/collection-nav";
import { InternalBackButton } from "@/components/navigation/internal-back-button";
import { EssentialFormPanel } from "@/components/travel/essential-form-panel";
import { TravelShellNav } from "@/components/travel/travel-shell-nav";
import { BrandedLoadingScreen } from "@/components/ui/branded-loading-screen";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createEssentialLibraryItems,
  createEssentialLibraryItem,
  deleteEssentialLibraryItem,
  getEssentialLibraryItems,
  reorderEssentialLibraryItems,
  updateEssentialLibraryItem,
} from "@/lib/data/travel";
import { formatEssentialInclusionType, STARTER_ESSENTIAL_LIBRARY_ITEMS } from "@/lib/travel";
import { useWardrobeSession } from "@/hooks/use-wardrobe-session";
import type { EssentialLibraryItem, EssentialLibraryItemInput } from "@/types/travel";

export function EssentialsLibraryApp() {
  const { supabase, session, isSessionLoading, handleLogin } = useWardrobeSession();
  const [items, setItems] = useState<EssentialLibraryItem[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EssentialLibraryItem | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadItems() {
      if (!session) {
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        let nextItems = await getEssentialLibraryItems(supabase);

        if (nextItems.filter((item) => !item.is_archived).length === 0) {
          nextItems = await createEssentialLibraryItems(
            supabase,
            session.user.id,
            STARTER_ESSENTIAL_LIBRARY_ITEMS,
          );
        }

        if (isActive) {
          setItems(nextItems.filter((item) => !item.is_archived));
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load the essentials library.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadItems();

    return () => {
      isActive = false;
    };
  }, [session, supabase]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) =>
      [item.title, item.category, item.notes, formatEssentialInclusionType(item.inclusion_type)]
        .filter((field): field is string => Boolean(field))
        .some((field) => field.toLowerCase().includes(normalizedQuery)),
    );
  }, [items, query]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce<Record<string, EssentialLibraryItem[]>>((accumulator, item) => {
      const key = item.category || "Custom";
      accumulator[key] = accumulator[key] ? [...accumulator[key], item] : [item];
      return accumulator;
    }, {});
  }, [filteredItems]);

  async function handleSaveItem(input: EssentialLibraryItemInput, itemId?: string) {
    if (!session) {
      return;
    }

    if (itemId) {
      const updated = await updateEssentialLibraryItem(supabase, itemId, input);
      setItems((current) => current.map((item) => (item.id === itemId ? updated : item)));
      setNotice(`${updated.title} updated.`);
      return;
    }

    const created = await createEssentialLibraryItem(supabase, session.user.id, input);
    setItems((current) => [...current, created].sort((left, right) => left.sort_order - right.sort_order));
    setNotice(`${created.title} added to your essentials library.`);
  }

  async function handleDeleteItem(item: EssentialLibraryItem) {
    const confirmed = window.confirm(`Delete "${item.title}" from the essentials library?`);

    if (!confirmed) {
      return;
    }

    await deleteEssentialLibraryItem(supabase, item.id);
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    setNotice(`${item.title} deleted.`);
  }

  async function handleDuplicateItem(item: EssentialLibraryItem) {
    if (!session) {
      return;
    }

    const duplicated = await createEssentialLibraryItem(supabase, session.user.id, {
      title: `${item.title} Copy`,
      category: item.category,
      inclusion_type: item.inclusion_type,
      notes: item.notes ?? "",
    });

    setItems((current) => [...current, duplicated].sort((left, right) => left.sort_order - right.sort_order));
    setNotice(`${item.title} duplicated.`);
  }

  async function handleMove(itemId: string, direction: "up" | "down") {
    const currentIndex = items.findIndex((item) => item.id === itemId);

    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    const nextItems = [...items];
    const [moved] = nextItems.splice(currentIndex, 1);
    nextItems.splice(targetIndex, 0, moved);

    const resequenced = nextItems.map((item, index) => ({ ...item, sort_order: index }));
    setItems(resequenced);

    try {
      await reorderEssentialLibraryItems(supabase, resequenced);
    } catch (error) {
      setItems(items);
      setErrorMessage(error instanceof Error ? error.message : "Unable to reorder essentials.");
      return;
    }

    setNotice(`${moved.title} moved ${direction}.`);
  }

  if (isSessionLoading) {
    return <BrandedLoadingScreen title="Preparing your essentials library" theme="travel" />;
  }

  if (!session) {
    return <LoginForm onSubmit={handleLogin} />;
  }

  return (
    <main className="page-shell">
      <CollectionNav />
      <InternalBackButton href="/travel" label="Back to trips" />

      <header className="page-header page-header-stack">
        <div>
          <h1 className="page-title">Travel</h1>
        </div>
        <TravelShellNav />
      </header>

      {errorMessage ? (
        <section className="dashboard">
          <EmptyState title="Could not load essentials" description={errorMessage} />
        </section>
      ) : isLoading ? (
        <BrandedLoadingScreen title="Preparing your essentials library" theme="travel" />
      ) : (
        <section className="dashboard dashboard-tight">
          <div className="results-bar inventory-overview">
            <div className="results-copy">
              <p className="results-heading">Essentials library</p>
              <p>{filteredItems.length} reusable essential{filteredItems.length === 1 ? "" : "s"} ready for trips.</p>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setEditingItem(null);
                setEditorOpen(true);
              }}
            >
              Add essential
            </button>
          </div>

          {notice ? <p className="inline-notice">{notice}</p> : null}

          <div className="dashboard-card">
            <div className="search-panel search-panel-compact">
              <label className="search-label" htmlFor="essentials-search">
                Search by item name, category, notes, or inclusion type
              </label>
              <input
                id="essentials-search"
                className="search-input"
                type="search"
                value={query}
                placeholder="Search essentials"
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="No essentials saved yet"
              description="Start the library with the pieces you always reach for before a trip, then let each trip load from here."
            />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              title="No essentials match this search"
              description="Try another item name, category, or library role."
            />
          ) : (
            <div className="essentials-groups">
              {Object.entries(groupedItems)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([category, groupItems]) => (
                  <section key={category} className="detail-card essentials-group-card">
                    <div className="results-bar">
                      <div className="results-copy">
                        <p className="results-heading">{category}</p>
                        <p>{groupItems.length} saved item{groupItems.length === 1 ? "" : "s"}</p>
                      </div>
                    </div>

                    <div className="essentials-list">
                      {groupItems.map((item) => {
                        const absoluteIndex = items.findIndex((entry) => entry.id === item.id);

                        return (
                          <article key={item.id} className="essential-row">
                            <div className="essential-row-copy">
                              <div className="essential-row-head">
                                <div>
                                  <p className="sku-label">Essential</p>
                                  <h2>{item.title}</h2>
                                </div>
                                <span className="trip-meta-pill">
                                  {formatEssentialInclusionType(item.inclusion_type)}
                                </span>
                              </div>
                              {item.notes ? <p className="trip-card-notes">{item.notes}</p> : null}
                            </div>

                            <div className="essential-row-actions">
                              <button
                                type="button"
                                className="ghost-button studio-mini-button"
                                onClick={() => handleMove(item.id, "up")}
                                disabled={absoluteIndex <= 0}
                              >
                                Move up
                              </button>
                              <button
                                type="button"
                                className="ghost-button studio-mini-button"
                                onClick={() => handleMove(item.id, "down")}
                                disabled={absoluteIndex === items.length - 1}
                              >
                                Move down
                              </button>
                              <button
                                type="button"
                                className="ghost-button studio-mini-button"
                                onClick={() => handleDuplicateItem(item)}
                              >
                                Duplicate
                              </button>
                              <button
                                type="button"
                                className="ghost-button studio-mini-button"
                                onClick={() => {
                                  setEditingItem(item);
                                  setEditorOpen(true);
                                }}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="ghost-button studio-mini-button danger-button"
                                onClick={() => handleDeleteItem(item)}
                              >
                                Delete
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
            </div>
          )}
        </section>
      )}

      <EssentialFormPanel
        open={editorOpen}
        item={editingItem}
        onClose={() => {
          setEditorOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleSaveItem}
      />
    </main>
  );
}
