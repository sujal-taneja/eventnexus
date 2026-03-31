"use client";

import { useRouter } from "next/navigation";
import { SortOption } from "@/lib/search";
import { SearchBar } from "./search-bar";
import { SlidersHorizontal } from "lucide-react";
import { useState, useEffect } from "react";

interface EventsFiltersProps {
  categories: string[];
  currentQ: string;
  /** Location keyword (matches event venue/area). */
  currentCity: string;
  currentCategory: string;
  currentSort: SortOption;
  currentMinPrice: string | undefined;
  currentMaxPrice: string | undefined;
  totalResults: number;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date_asc", label: "Date: Soonest" },
  { value: "date_desc", label: "Date: Latest" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
];

export function EventsFilters({
  categories,
  currentQ,
  currentCity,
  currentCategory,
  currentSort,
  currentMinPrice,
  currentMaxPrice,
  totalResults,
}: EventsFiltersProps) {
  const router = useRouter();
  const [showPriceFilter, setShowPriceFilter] = useState(
    !!(currentMinPrice || currentMaxPrice)
  );
  const [cityDraft, setCityDraft] = useState(currentCity);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);

  useEffect(() => {
    setCityDraft(currentCity);
  }, [currentCity]);

  useEffect(() => {
    const q = cityDraft.trim();
    if (q.length < 2) {
      setCitySuggestions([]);
      return;
    }
    const t = window.setTimeout(() => {
      void fetch(`/api/search/cities?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d: { suggestions?: string[] }) =>
          setCitySuggestions(Array.isArray(d.suggestions) ? d.suggestions : [])
        )
        .catch(() => setCitySuggestions([]));
    }, 220);
    return () => window.clearTimeout(t);
  }, [cityDraft]);

  // Rebuild URL with updated params, preserving everything else
  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();

    const merged: Record<string, string | undefined> = {
      q: currentQ || undefined,
      city: currentCity.trim() || undefined,
      category: currentCategory !== "all" ? currentCategory : undefined,
      sort: currentSort !== "date_asc" ? currentSort : undefined,
      minPrice: currentMinPrice,
      maxPrice: currentMaxPrice,
      ...overrides,
    };

    for (const [key, val] of Object.entries(merged)) {
      if (val !== undefined && val !== "") {
        params.set(key, val);
      }
    }

    return `/events${params.toString() ? "?" + params.toString() : ""}`;
  }

  const handleCategory = (cat: string) => {
    router.push(buildUrl({ category: cat === "all" ? undefined : cat }));
  };

  const handleSort = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(buildUrl({ sort: e.target.value as SortOption }));
  };

  const handlePriceApply = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    router.push(
      buildUrl({
        minPrice: (fd.get("minPrice") as string) || undefined,
        maxPrice: (fd.get("maxPrice") as string) || undefined,
      })
    );
  };

  const handleClearPrice = () => {
    router.push(buildUrl({ minPrice: undefined, maxPrice: undefined }));
    setShowPriceFilter(false);
  };

  const allCats = ["all", ...categories];

  return (
    <div className="space-y-4 mb-8">
      {/* Search bar + sort row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar
          defaultValue={currentQ}
          basePath="/events"
          extraParams={{
            ...(currentCity.trim() ? { city: currentCity.trim() } : {}),
            ...(currentCategory !== "all" ? { category: currentCategory } : {}),
            ...(currentSort !== "date_asc" ? { sort: currentSort } : {}),
          }}
          placeholder="Search events..."
          className="flex-1"
        />

        <div className="flex gap-2 shrink-0">
          {/* Sort */}
          <select
            value={currentSort}
            onChange={handleSort}
            className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2.5 text-[0.8125rem] text-[var(--text-primary)] outline-none focus:border-white/20 transition-colors cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#0a0a0f]">
                {o.label}
              </option>
            ))}
          </select>

          {/* Price filter toggle */}
          <button
            type="button"
            onClick={() => setShowPriceFilter((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[0.8125rem] transition-colors ${
              currentMinPrice || currentMaxPrice
                ? "bg-white/10 border-white/20 text-white"
                : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:border-white/20"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Price
          </button>
        </div>
      </div>

      {/* City / area filter (Module 1 — city selector) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const c = cityDraft.trim();
          router.push(buildUrl({ city: c || undefined }));
          setSuggestOpen(false);
        }}
        className="flex flex-col sm:flex-row gap-2 max-w-xl relative"
      >
        <div className="flex-1 relative">
          <input
            name="city"
            type="text"
            value={cityDraft}
            onChange={(e) => {
              setCityDraft(e.target.value);
              setSuggestOpen(true);
            }}
            onFocus={() => setSuggestOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setSuggestOpen(false), 180);
            }}
            autoComplete="off"
            placeholder="City or venue area"
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[0.8125rem] text-[var(--text-primary)] outline-none focus:border-white/20 placeholder:text-[var(--text-muted)]"
          />
          {suggestOpen && citySuggestions.length > 0 && (
            <ul className="absolute z-30 top-full left-0 right-0 mt-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] shadow-lg max-h-48 overflow-auto py-1">
              {citySuggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-[0.8125rem] text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setCityDraft(s);
                      setSuggestOpen(false);
                      router.push(buildUrl({ city: s }));
                    }}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="submit" className="btn-secondary text-[0.8125rem] py-2 px-4">
            Filter area
          </button>
          {currentCity.trim() ? (
            <button
              type="button"
              onClick={() => router.push(buildUrl({ city: undefined }))}
              className="text-[0.8125rem] text-[var(--text-muted)] hover:text-white px-3 py-2"
            >
              Clear
            </button>
          ) : null}
        </div>
      </form>

      {/* Price range panel */}
      {showPriceFilter && (
        <form
          onSubmit={handlePriceApply}
          className="glass border border-[var(--border-subtle)] rounded-lg p-4 flex flex-wrap items-end gap-3"
        >
          <div className="space-y-1">
            <label className="text-[0.75rem] text-[var(--text-muted)]">
              Min price (₹)
            </label>
            <input
              name="minPrice"
              type="number"
              min={0}
              defaultValue={currentMinPrice ?? ""}
              placeholder="0"
              className="w-28 bg-black/40 border border-[var(--border-subtle)] rounded-md px-3 py-1.5 text-[0.8125rem] text-white outline-none focus:border-white/20"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[0.75rem] text-[var(--text-muted)]">
              Max price (₹)
            </label>
            <input
              name="maxPrice"
              type="number"
              min={0}
              defaultValue={currentMaxPrice ?? ""}
              placeholder="Any"
              className="w-28 bg-black/40 border border-[var(--border-subtle)] rounded-md px-3 py-1.5 text-[0.8125rem] text-white outline-none focus:border-white/20"
            />
          </div>
          <button type="submit" className="btn-secondary text-[0.8125rem] py-1.5">
            Apply
          </button>
          {(currentMinPrice || currentMaxPrice) && (
            <button
              type="button"
              onClick={handleClearPrice}
              className="text-[0.8125rem] text-[var(--text-muted)] hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      )}

      {/* Category chips */}
      <div className="flex gap-1.5 flex-wrap">
        {allCats.map((cat) => {
          const isActive =
            cat === "all"
              ? currentCategory === "all" || !currentCategory
              : currentCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-[0.8125rem] transition-all duration-150 capitalize ${
                isActive
                  ? "bg-white text-black font-medium"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/[0.03] border border-[var(--border-subtle)]"
              }`}
            >
              {cat === "all" ? "All Events" : cat}
            </button>
          );
        })}
      </div>

      {/* Results count */}
      {(currentQ || currentCategory !== "all") && (
        <p className="text-[0.8125rem] text-[var(--text-muted)]">
          {totalResults === 0
            ? "No events found"
            : `${totalResults} event${totalResults !== 1 ? "s" : ""} found${currentQ ? ` for "${currentQ}"` : ""}`}
        </p>
      )}
    </div>
  );
}
