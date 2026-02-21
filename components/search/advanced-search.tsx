"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Filter,
  Calendar,
  Tag,
  FolderOpen,
  User,
  Bookmark,
  FileText,
} from "lucide-react";
import { listDocuments, getDocument } from "@/lib/documents/store";
import {
  listTags,
  getDocumentTags,
  type Tag as TagType,
} from "@/lib/tags/store";
import { listCollections, type Collection } from "@/lib/collections/store";
import type { DocumentMeta } from "@/lib/documents/types";

interface AdvancedSearchProps {
  onSelect: (documentId: string) => void;
  onClose: () => void;
}

interface SearchFilters {
  query: string;
  tagIds: string[];
  collectionIds: string[];
  dateFrom: string;
  dateTo: string;
  author: string;
  searchIn: "all" | "title" | "content";
}

interface SavedSearch {
  id: string;
  name: string;
  filters: SearchFilters;
}

const LS_SAVED_SEARCH_KEY = "knobase-app:saved-searches";

function readSavedSearches(): SavedSearch[] {
  try {
    const raw = localStorage.getItem(LS_SAVED_SEARCH_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeSavedSearches(searches: SavedSearch[]): void {
  localStorage.setItem(LS_SAVED_SEARCH_KEY, JSON.stringify(searches));
}

const DEFAULT_FILTERS: SearchFilters = {
  query: "",
  tagIds: [],
  collectionIds: [],
  dateFrom: "",
  dateTo: "",
  author: "",
  searchIn: "all",
};

export function AdvancedSearch({ onSelect, onClose }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({ ...DEFAULT_FILTERS });
  const [showFilters, setShowFilters] = useState(false);
  const [tags, setTags] = useState<TagType[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [saveName, setSaveName] = useState("");
  const [allDocs, setAllDocs] = useState<DocumentMeta[]>([]);

  useEffect(() => {
    setTags(listTags());
    setCollections(listCollections());
    setSavedSearches(readSavedSearches());
    setAllDocs(listDocuments());
  }, []);

  const results = useMemo(() => {
    let docs = allDocs;

    if (filters.query) {
      const q = filters.query.toLowerCase();
      docs = docs.filter((doc) => {
        if (filters.searchIn === "title") {
          return doc.title.toLowerCase().includes(q);
        }
        if (filters.searchIn === "content") {
          const full = getDocument(doc.id);
          return full?.content.toLowerCase().includes(q) ?? false;
        }
        const full = getDocument(doc.id);
        return (
          doc.title.toLowerCase().includes(q) ||
          (full?.content.toLowerCase().includes(q) ?? false)
        );
      });
    }

    if (filters.tagIds.length > 0) {
      docs = docs.filter((doc) => {
        const docTags = getDocumentTags(doc.id).map((t) => t.id);
        return filters.tagIds.some((id) => docTags.includes(id));
      });
    }

    if (filters.collectionIds.length > 0) {
      const allColls = listCollections();
      const colDocIds = new Set(
        filters.collectionIds.flatMap(
          (cid) => allColls.find((c) => c.id === cid)?.documentIds ?? [],
        ),
      );
      docs = docs.filter((d) => colDocIds.has(d.id));
    }

    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom).getTime();
      docs = docs.filter((d) => new Date(d.updatedAt).getTime() >= from);
    }

    if (filters.dateTo) {
      const to = new Date(filters.dateTo).getTime() + 86400000;
      docs = docs.filter((d) => new Date(d.updatedAt).getTime() <= to);
    }

    return docs;
  }, [filters, allDocs]);

  const handleSaveSearch = useCallback(() => {
    if (!saveName.trim()) return;
    const saved: SavedSearch = {
      id: crypto.randomUUID(),
      name: saveName.trim(),
      filters: { ...filters },
    };
    const all = [...savedSearches, saved];
    setSavedSearches(all);
    writeSavedSearches(all);
    setSaveName("");
  }, [saveName, filters, savedSearches]);

  const handleLoadSearch = useCallback((s: SavedSearch) => {
    setFilters({ ...s.filters });
    setShowFilters(true);
  }, []);

  const handleDeleteSaved = useCallback(
    (id: string) => {
      const filtered = savedSearches.filter((s) => s.id !== id);
      setSavedSearches(filtered);
      writeSavedSearches(filtered);
    },
    [savedSearches],
  );

  const hasActiveFilters =
    filters.tagIds.length > 0 ||
    filters.collectionIds.length > 0 ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.author;

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 pt-[15vh] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }}
        className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white shadow-2xl"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-neutral-100 px-4">
          <Search className="h-4 w-4 shrink-0 text-neutral-400" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) =>
              setFilters((f) => ({ ...f, query: e.target.value }))
            }
            placeholder="Search documents..."
            className="h-12 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
            autoFocus
          />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`rounded-md p-1.5 transition-colors ${
                showFilters || hasActiveFilters
                  ? "bg-purple-50 text-purple-600"
                  : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              }`}
              aria-label="Toggle filters"
            >
              <Filter className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-neutral-100"
            >
              <div className="space-y-3 px-4 py-3">
                {/* Search in */}
                <div className="flex items-center gap-2">
                  <span className="w-16 text-[11px] font-medium text-neutral-400">
                    Search in
                  </span>
                  <div className="flex gap-1">
                    {(["all", "title", "content"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() =>
                          setFilters((f) => ({ ...f, searchIn: opt }))
                        }
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          filters.searchIn === opt
                            ? "bg-neutral-900 text-white"
                            : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                        }`}
                      >
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Tag className="mt-1 h-3 w-3 shrink-0 text-neutral-400" />
                    <div className="flex flex-wrap gap-1">
                      {tags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() =>
                            setFilters((f) => ({
                              ...f,
                              tagIds: f.tagIds.includes(tag.id)
                                ? f.tagIds.filter((id) => id !== tag.id)
                                : [...f.tagIds, tag.id],
                            }))
                          }
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                            filters.tagIds.includes(tag.id)
                              ? "ring-1 ring-offset-1"
                              : "opacity-60 hover:opacity-100"
                          }`}
                          style={{
                            backgroundColor: `${tag.color}15`,
                            color: tag.color,
                            ...(filters.tagIds.includes(tag.id)
                              ? { ringColor: tag.color }
                              : {}),
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Collections */}
                {collections.length > 0 && (
                  <div className="flex items-start gap-2">
                    <FolderOpen className="mt-1 h-3 w-3 shrink-0 text-neutral-400" />
                    <div className="flex flex-wrap gap-1">
                      {collections.map((col) => (
                        <button
                          key={col.id}
                          onClick={() =>
                            setFilters((f) => ({
                              ...f,
                              collectionIds: f.collectionIds.includes(col.id)
                                ? f.collectionIds.filter((id) => id !== col.id)
                                : [...f.collectionIds, col.id],
                            }))
                          }
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                            filters.collectionIds.includes(col.id)
                              ? "bg-neutral-900 text-white"
                              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                          }`}
                        >
                          {col.icon} {col.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Date range */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 shrink-0 text-neutral-400" />
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, dateFrom: e.target.value }))
                    }
                    className="h-7 rounded-md border border-neutral-200 px-2 text-[11px] text-neutral-600 outline-none focus:border-purple-300"
                  />
                  <span className="text-[10px] text-neutral-400">to</span>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, dateTo: e.target.value }))
                    }
                    className="h-7 rounded-md border border-neutral-200 px-2 text-[11px] text-neutral-600 outline-none focus:border-purple-300"
                  />
                </div>

                {/* Save / Clear */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Save this search as..."
                    className="h-7 flex-1 rounded-md border border-neutral-200 px-2 text-[11px] outline-none placeholder:text-neutral-400 focus:border-purple-300"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveSearch();
                    }}
                  />
                  <button
                    onClick={handleSaveSearch}
                    disabled={!saveName.trim()}
                    className="flex h-7 items-center gap-1 rounded-md bg-neutral-900 px-2.5 text-[11px] font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
                  >
                    <Bookmark className="h-2.5 w-2.5" />
                    Save
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={() => setFilters({ ...DEFAULT_FILTERS })}
                      className="h-7 rounded-md px-2.5 text-[11px] text-neutral-500 hover:bg-neutral-100"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved searches */}
        {savedSearches.length > 0 && !showFilters && (
          <div className="border-b border-neutral-100 px-4 py-2">
            <div className="flex flex-wrap gap-1">
              {savedSearches.map((s) => (
                <div key={s.id} className="group flex items-center gap-0.5">
                  <button
                    onClick={() => handleLoadSearch(s)}
                    className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-500 transition-colors hover:bg-neutral-200"
                  >
                    <Bookmark className="mr-1 inline h-2.5 w-2.5" />
                    {s.name}
                  </button>
                  <button
                    onClick={() => handleDeleteSaved(s.id)}
                    className="rounded p-0.5 text-neutral-300 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    aria-label={`Delete saved search ${s.name}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="py-10 text-center">
              <FileText className="mx-auto mb-2 h-6 w-6 text-neutral-200" />
              <p className="text-xs text-neutral-400">
                {filters.query
                  ? "No documents found"
                  : "Start typing to search"}
              </p>
            </div>
          ) : (
            results.map((doc) => (
              <button
                key={doc.id}
                onClick={() => {
                  onSelect(doc.id);
                  onClose();
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50"
              >
                <FileText className="h-4 w-4 shrink-0 text-neutral-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {doc.title || "Untitled"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-neutral-400">
                    Updated{" "}
                    {new Date(doc.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 px-4 py-2">
          <p className="text-[10px] text-neutral-400">
            {results.length} result{results.length !== 1 ? "s" : ""}
            {hasActiveFilters && " (filtered)"}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
