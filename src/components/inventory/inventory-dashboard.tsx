"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { InventoryBulkActions } from "@/components/inventory/inventory-bulk-actions";
import { InventoryCard } from "@/components/inventory/inventory-card";
import { InventoryItemForm } from "@/components/inventory/inventory-item-form";
import { PaginationControls } from "@/components/inventory/pagination-controls";
import { SearchToolbar } from "@/components/inventory/search-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  bulkUpdateInventoryItems,
  createInventoryItem,
  deleteInventoryItem,
  updateInventoryItem,
} from "@/lib/data/inventory";
import {
  buildFilterOptions,
  EMPTY_INVENTORY_ITEM_INPUT,
  filterInventoryItems,
  getCategorySummary,
  sortInventoryItems,
} from "@/lib/inventory";
import type { InventoryBulkActionInput, InventoryFilters, InventoryItem, InventoryItemInput, InventoryPageSize } from "@/types/inventory";

const defaultFilters: InventoryFilters = {
  query: "",
  category: "",
  status: "",
  season: "",
  style_type: "",
  travel_friendly: "",
};

const INVENTORY_VIEW_STATE_KEY = "alikas-wardrobe:inventory-view-state";
const INVENTORY_SCROLL_KEY = "alikas-wardrobe:inventory-scroll";

type InventoryDashboardProps = {
  items: InventoryItem[];
  supabase: SupabaseClient;
  userId: string;
  onItemsChange: (items: InventoryItem[]) => void;
};

export function InventoryDashboard({
  items,
  supabase,
  userId,
  onItemsChange,
}: InventoryDashboardProps) {
  const savedState = useMemo(() => getStoredInventoryViewState(), []);
  const hasHydratedFilters = useRef(false);

  const [filters, setFilters] = useState<InventoryFilters>(savedState?.filters ?? defaultFilters);
  const [currentPage, setCurrentPage] = useState(savedState?.currentPage ?? 1);
  const [pageSize, setPageSize] = useState<InventoryPageSize>(savedState?.pageSize ?? 48);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<"default" | "error">("default");
  const [duplicateSeed, setDuplicateSeed] = useState<InventoryItemInput | null>(null);

  const filterOptions = useMemo(() => buildFilterOptions(items), [items]);
  const filteredItems = useMemo(() => filterInventoryItems(items, filters), [items, filters]);
  const categorySummary = useMemo(() => getCategorySummary(filteredItems), [filteredItems]);
  const totalPages = useMemo(() => {
    if (pageSize === "all") {
      return 1;
    }

    return Math.max(1, Math.ceil(filteredItems.length / pageSize));
  }, [filteredItems.length, pageSize]);

  const paginatedItems = useMemo(() => {
    if (pageSize === "all") {
      return filteredItems;
    }

    const startIndex = (currentPage - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [currentPage, filteredItems, pageSize]);

  const currentRange = useMemo(() => {
    if (filteredItems.length === 0) {
      return { start: 0, end: 0 };
    }

    if (pageSize === "all") {
      return { start: 1, end: filteredItems.length };
    }

    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, filteredItems.length);

    return { start, end };
  }, [currentPage, filteredItems.length, pageSize]);

  useEffect(() => {
    if (!hasHydratedFilters.current) {
      hasHydratedFilters.current = true;
      return;
    }

    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.sessionStorage.setItem(
      INVENTORY_VIEW_STATE_KEY,
      JSON.stringify({
        filters,
        currentPage,
        pageSize,
      }),
    );
  }, [currentPage, filters, pageSize]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const restoreScroll = () => {
      const rawValue = window.sessionStorage.getItem(INVENTORY_SCROLL_KEY);
      const scrollY = rawValue ? Number(rawValue) : 0;

      if (Number.isFinite(scrollY) && scrollY > 0) {
        window.scrollTo({ top: scrollY, behavior: "auto" });
      }
    };

    const animationFrame = window.requestAnimationFrame(restoreScroll);
    const handleScroll = () => {
      window.sessionStorage.setItem(INVENTORY_SCROLL_KEY, `${window.scrollY}`);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      handleScroll();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  function handleFiltersChange(nextFilters: InventoryFilters) {
    setFilters(nextFilters);
  }

  function handlePageChange(nextPage: number) {
    setCurrentPage(Math.min(Math.max(nextPage, 1), totalPages));
  }

  function handlePageSizeChange(nextPageSize: InventoryPageSize) {
    setPageSize(nextPageSize);
    setCurrentPage(1);
  }

  function updateItems(nextItems: InventoryItem[], message?: string) {
    onItemsChange(sortInventoryItems(nextItems));
    if (message) {
      setNoticeTone("default");
      setNotice(message);
    }
  }

  async function handleSaveItem(input: InventoryItemInput, currentId?: string) {
    if (currentId) {
      const updated = await updateInventoryItem(supabase, currentId, input);
      updateItems(items.map((item) => (item.id === currentId ? updated : item)), `${updated.item_id} updated.`);
      return;
    }

    const created = await createInventoryItem(supabase, userId, input);
    updateItems([...items, created], `${created.item_id} added to the wardrobe.`);
  }

  async function handleDeleteItem(item: InventoryItem) {
    await deleteInventoryItem(supabase, item.id);
    updateItems(
      items.filter((entry) => entry.id !== item.id),
      `${item.item_id} permanently deleted.`,
    );
    setSelectedIds((current) => current.filter((id) => id !== item.id));
  }

  async function handleBulkAction(action: InventoryBulkActionInput) {
    const updatedRows = await bulkUpdateInventoryItems(supabase, items, selectedIds, action);
    const updatedMap = new Map(updatedRows.map((item) => [item.id, item]));

    updateItems(
      items.map((item) => updatedMap.get(item.id) ?? item),
      `${selectedIds.length} wardrobe item${selectedIds.length === 1 ? "" : "s"} updated.`,
    );
    setSelectedIds([]);
  }

  function openCreateForm(seed?: InventoryItemInput) {
    setEditingItem(null);
    setDuplicateSeed(seed ?? null);
    setIsFormOpen(true);
  }

  function closeForm() {
    setEditingItem(null);
    setDuplicateSeed(null);
    setIsFormOpen(false);
  }

  const formItem = editingItem;

  return (
    <section className="dashboard">
      <div className="dashboard-card">
        <SearchToolbar
          filters={filters}
          filterOptions={filterOptions}
          onChange={handleFiltersChange}
          totalCount={items.length}
          resultCount={filteredItems.length}
        />
      </div>

      <div className="results-bar inventory-overview">
        <div className="results-copy">
          <p className="results-heading">Curated inventory</p>
          <p>
            Showing <strong>{filteredItems.length}</strong> of <strong>{items.length}</strong>{" "}
            pieces
          </p>
        </div>
        <div className="inventory-toolbar-actions">
          <button type="button" className="ghost-button" onClick={() => setSelectedIds(paginatedItems.map((item) => item.id))}>
            Select page
          </button>
          <button type="button" className="primary-button" onClick={() => openCreateForm()}>
            Add new item
          </button>
        </div>
      </div>

      {notice ? (
        <p className={noticeTone === "error" ? "form-error" : "inline-notice"}>{notice}</p>
      ) : null}

      <div className="pill-row category-summary-row">
        {categorySummary.slice(0, 6).map((category) => (
          <span className="pill category-pill" key={category.name}>
            <strong>{category.name}</strong>
            <small>{category.count}</small>
          </span>
        ))}
      </div>

      {selectedIds.length > 0 ? (
        <InventoryBulkActions
          selectedCount={selectedIds.length}
          categoryOptions={filterOptions.categories}
          onApply={handleBulkAction}
          onClear={() => setSelectedIds([])}
        />
      ) : null}

      {filteredItems.length === 0 ? (
        <EmptyState
          title="No items match these filters"
          description="Try broadening your search or clearing one of the active filters."
        />
      ) : (
        <>
          <div className="inventory-grid">
            {paginatedItems.map((item) => (
              <InventoryCard
                key={item.id}
                item={item}
                selected={selectedIds.includes(item.id)}
                onSelectChange={(checked) =>
                  setSelectedIds((current) =>
                    checked ? [...new Set([...current, item.id])] : current.filter((id) => id !== item.id),
                  )
                }
                onQuickEdit={() => {
                  setEditingItem(item);
                  setDuplicateSeed(null);
                  setIsFormOpen(true);
                }}
              />
            ))}
          </div>

          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filteredItems.length}
            totalPages={totalPages}
            currentRange={currentRange}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </>
      )}

      <InventoryItemForm
        open={isFormOpen}
        item={formItem}
        existingItems={items}
        categories={filterOptions.categories}
        initialDraft={duplicateSeed}
        onClose={closeForm}
        onSubmit={handleSaveItem}
        onDelete={handleDeleteItem}
        onDuplicate={(seed) => {
          setEditingItem(null);
          setDuplicateSeed({ ...EMPTY_INVENTORY_ITEM_INPUT, ...seed });
          setIsFormOpen(true);
        }}
      />
    </section>
  );
}

function getStoredInventoryViewState(): {
  filters: InventoryFilters;
  currentPage: number;
  pageSize: InventoryPageSize;
} | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(INVENTORY_VIEW_STATE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue) as Partial<{
      filters: InventoryFilters;
      currentPage: number;
      pageSize: InventoryPageSize;
    }>;

    return {
      filters: {
        ...defaultFilters,
        ...(parsed.filters ?? {}),
      },
      currentPage:
        typeof parsed.currentPage === "number" && parsed.currentPage > 0 ? parsed.currentPage : 1,
      pageSize:
        parsed.pageSize === 24 ||
        parsed.pageSize === 48 ||
        parsed.pageSize === 96 ||
        parsed.pageSize === "all"
          ? parsed.pageSize
          : 48,
    };
  } catch {
    return null;
  }
}
