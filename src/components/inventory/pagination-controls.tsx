import type { InventoryPageSize } from "@/types/inventory";

const pageSizeOptions: InventoryPageSize[] = [24, 48, 96, "all"];

type PaginationControlsProps = {
  currentPage: number;
  pageSize: InventoryPageSize;
  totalItems: number;
  totalPages: number;
  currentRange: {
    start: number;
    end: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: InventoryPageSize) => void;
};

export function PaginationControls({
  currentPage,
  pageSize,
  totalItems,
  totalPages,
  currentRange,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  const pageNumbers = getVisiblePageNumbers(currentPage, totalPages);

  return (
    <div className="pagination-shell">
      <div className="pagination-summary">
        <p className="pagination-range">
          Showing {currentRange.start}-{currentRange.end} of {totalItems} items
        </p>

        <label className="pagination-size">
          <span>View</span>
          <select
            className="pagination-select"
            value={pageSize}
            onChange={(event) => onPageSizeChange(parsePageSize(event.target.value))}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "All" : option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="pagination-controls">
        <button
          className="pagination-button"
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>

        <div className="pagination-pages" aria-label="Pagination">
          {pageNumbers.map((pageNumber, index) =>
            pageNumber === "ellipsis" ? (
              <span className="pagination-ellipsis" key={`ellipsis-${index}`}>
                ...
              </span>
            ) : (
              <button
                key={pageNumber}
                className={`pagination-page ${pageNumber === currentPage ? "is-active" : ""}`}
                type="button"
                onClick={() => onPageChange(pageNumber)}
                aria-current={pageNumber === currentPage ? "page" : undefined}
              >
                {pageNumber}
              </button>
            ),
          )}
        </div>

        <button
          className="pagination-button"
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function parsePageSize(value: string): InventoryPageSize {
  if (value === "all") {
    return "all";
  }

  const parsed = Number(value);
  return parsed === 24 || parsed === 48 || parsed === 96 ? parsed : 48;
}

function getVisiblePageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    pages.push("ellipsis");
  }

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (end < totalPages - 1) {
    pages.push("ellipsis");
  }

  pages.push(totalPages);

  return pages;
}
