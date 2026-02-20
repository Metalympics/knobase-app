"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, FileText, Clock, X, CornerDownLeft } from "lucide-react";
import {
  search,
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
  type SearchResult,
} from "@/lib/search/index";

interface GlobalSearchProps {
  onSelect: (documentId: string) => void;
  onClose: () => void;
}

export function GlobalSearch({ onSelect, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const r = search(query);
    setResults(r);
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (docId: string) => {
      if (query.trim()) addRecentSearch(query.trim());
      onSelect(docId);
      onClose();
    },
    [query, onSelect, onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(results.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (i) => (i - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1)
        );
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex].document.id);
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [results, selectedIndex, handleSelect, onClose]
  );

  const showRecent = !query.trim() && recentSearches.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-[#e5e5e5] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[#e5e5e5] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search documents..."
            className="flex-1 text-sm outline-none"
          />
          <kbd className="hidden rounded border border-[#e5e5e5] px-1.5 py-0.5 text-[10px] text-neutral-400 sm:inline">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {showRecent && (
            <div className="p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                  Recent
                </span>
                <button
                  onClick={() => {
                    clearRecentSearches();
                    setRecentSearches([]);
                  }}
                  className="text-[10px] text-neutral-400 hover:text-neutral-600"
                >
                  Clear
                </button>
              </div>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50"
                >
                  <Clock className="h-3.5 w-3.5 text-neutral-300" />
                  {s}
                </button>
              ))}
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-neutral-400">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {results.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                Documents ({results.length})
              </div>
              {results.map((result, i) => (
                <button
                  key={result.document.id}
                  onClick={() => handleSelect(result.document.id)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors ${
                    i === selectedIndex
                      ? "bg-neutral-100"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-neutral-900">
                      {result.document.title || "Untitled"}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-neutral-400">
                      {result.snippet}
                    </div>
                  </div>
                  {i === selectedIndex && (
                    <CornerDownLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-300" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-[#e5e5e5] px-4 py-2 text-[10px] text-neutral-400">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[#e5e5e5] px-1 py-0.5">↑↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[#e5e5e5] px-1 py-0.5">↵</kbd> open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[#e5e5e5] px-1 py-0.5">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
