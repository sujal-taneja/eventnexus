"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ArrowRight } from "lucide-react";

interface SearchBarProps {
  /** Initial value to pre-fill (e.g. from URL searchParams). */
  defaultValue?: string;
  /** Where to navigate on submit. Defaults to "/events". */
  basePath?: string;
  /** Extra URL params to preserve on submit (e.g. { category: "Tech" }). */
  extraParams?: Record<string, string>;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  /** Called after the bar navigates (used by Navbar to collapse the bar). */
  onClose?: () => void;
}

export function SearchBar({
    defaultValue = "",
    basePath = "/events",
    extraParams = {},
    placeholder = "Search events, artists, venues...",
    className = "",
    autoFocus = false,
    onClose,
  }: SearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Debounced suggestions fetch ──────────────────────────────────────────
  // All setState calls live inside the setTimeout callback — never synchronously
  // in the effect body — to satisfy the react-hooks/set-state-in-effect rule.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const trimmed = value.trim();
      if (trimmed.length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json();
        setSuggestions(data.suggestions ?? []);
        setOpen((data.suggestions ?? []).length > 0);
        setActiveIdx(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  // ── Click outside → close ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────
  const navigate = useCallback(
    (query: string) => {
      const params = new URLSearchParams(extraParams);
      if (query.trim()) {
        params.set("q", query.trim());
      } else {
        params.delete("q");
      }
      setOpen(false);
      onClose?.();
      router.push(`${basePath}?${params.toString()}`);
    },
    [basePath, extraParams, onClose, router]
  );

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const chosen =
      activeIdx >= 0 && activeIdx < suggestions.length
        ? suggestions[activeIdx]
        : value;
    navigate(chosen);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const handleClear = () => {
    setValue("");
    setSuggestions([]);
    setOpen(false);
    navigate("");
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit}>
        <div className="flex items-center gap-3 rounded-lg px-4 py-2.5 w-full transition-all duration-200 focus-within:border-[var(--border-hover)] border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="flex-1 bg-transparent text-[0.8125rem] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none min-w-0"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="submit"
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-hover)] transition-colors"
            aria-label="Search"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 mt-1.5 glass border border-[var(--border-subtle)] rounded-lg overflow-hidden z-50 shadow-xl">
          {suggestions.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => {
                  setValue(s);
                  navigate(s);
                }}
                className={`w-full text-left px-4 py-2.5 text-[0.8125rem] flex items-center gap-2.5 transition-colors ${
                  i === activeIdx
                    ? "bg-[var(--bg-card-hover)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                }`}
              >
                <Search className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
