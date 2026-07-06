import type { InventoryFilters } from "@/types/inventory";

type SearchToolbarProps = {
  filters: InventoryFilters;
  filterOptions: {
    categories: string[];
    statuses: string[];
    seasons: string[];
    styleTypes: string[];
    travelFriendly: string[];
  };
  totalCount: number;
  resultCount: number;
  onChange: (filters: InventoryFilters) => void;
};

export function SearchToolbar({
  filters,
  filterOptions,
  totalCount,
  resultCount,
  onChange,
}: SearchToolbarProps) {
  return (
    <div className="toolbar-grid">
      <div className="search-panel">
        <label className="search-label" htmlFor="inventory-search">
          Discover by name, SKU, colour, category, tags, or vibe
        </label>
        <input
          id="inventory-search"
          className="search-input"
          type="search"
          value={filters.query}
          placeholder="Search the wardrobe"
          onChange={(event) =>
            onChange({
              ...filters,
              query: event.target.value,
            })
          }
        />
      </div>

      <div className="filter-grid editorial-filter-grid">
        <FilterSelect
          label={`Category (${filterOptions.categories.length})`}
          value={filters.category}
          options={filterOptions.categories}
          onChange={(value) => onChange({ ...filters, category: value })}
        />
        <FilterSelect
          label={`Status (${filterOptions.statuses.length})`}
          value={filters.status}
          options={filterOptions.statuses}
          onChange={(value) => onChange({ ...filters, status: value })}
        />
        <FilterSelect
          label={`Season (${filterOptions.seasons.length})`}
          value={filters.season}
          options={filterOptions.seasons}
          onChange={(value) => onChange({ ...filters, season: value })}
        />
        <FilterSelect
          label={`Style type (${filterOptions.styleTypes.length})`}
          value={filters.style_type}
          options={filterOptions.styleTypes}
          onChange={(value) => onChange({ ...filters, style_type: value })}
        />
        <FilterSelect
          label="Travel friendly"
          value={filters.travel_friendly}
          options={filterOptions.travelFriendly}
          onChange={(value) => onChange({ ...filters, travel_friendly: value })}
        />
      </div>

      <div className="results-bar">
        <p>
          Browse {resultCount} results from {totalCount} pieces.
        </p>
      </div>
    </div>
  );
}

type FilterSelectProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

function FilterSelect({ label, value, options, onChange }: FilterSelectProps) {
  return (
    <div className="filter-group">
      <label className="filter-label">{label}</label>
      <select
        className="filter-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
