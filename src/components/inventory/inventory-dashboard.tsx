"use client";

import { useEffect, useMemo, useState } from "react";

import { InventoryCard } from "@/components/inventory/inventory-card";
import { PaginationControls } from "@/components/inventory/pagination-controls";
import { SearchToolbar } from "@/components/inventory/search-toolbar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  buildFilterOptions,
  filterInventoryItems,
  getCategorySummary,
} from "@/lib/inventory";
import type { InventoryFilters, InventoryItem, InventoryPageSize } from "@/types/inventory";

const defaultFilters: InventoryFilters = {
  query: "",
  category: "",
  status: "",
  season: "",
  style_type: "",
  travel_friendly: "",
};

type InventoryDashboardProps = {
  items: InventoryItem[];
};

export function InventoryDashboard({ items }: InventoryDashboardProps) {
  const [filters, setFilters] = useState<InventoryFilters>(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<InventoryPageSize>(48);

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
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

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
        <div className="pill-row category-summary-row">
          {categorySummary.slice(0, 6).map((category) => (
            <span className="pill category-pill" key={category.name}>
              <strong>{category.name}</strong>
              <small>{category.count}</small>
            </span>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          title="No items match these filters"
          description="Try broadening your search or clearing one of the active filters."
        />
      ) : (
        <>
          <div className="inventory-grid">
            {paginatedItems.map((item) => (
              <InventoryCard key={item.id} item={item} />
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
    </section>
  );
}
