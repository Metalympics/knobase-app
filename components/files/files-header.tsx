"use client";

import {
  Upload,
  Search,
  LayoutGrid,
  List,
  Trash2,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { formatFileSize } from "@/lib/files/types";
import type { ViewMode } from "@/hooks/use-files";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface FilesHeaderProps {
  onUploadClick: () => void;
  fileCount: number;
  totalSize: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterType: string;
  onFilterTypeChange: (t: string) => void;
  selectedCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
}

/* ------------------------------------------------------------------ */
/* File type filter options                                             */
/* ------------------------------------------------------------------ */

const FILE_TYPE_FILTERS = [
  { value: "", label: "All types" },
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "Word" },
  { value: "xlsx", label: "Excel" },
  { value: "csv", label: "CSV" },
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPEG" },
  { value: "json", label: "JSON" },
  { value: "md", label: "Markdown" },
  { value: "txt", label: "Text" },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function FilesHeader({
  onUploadClick,
  fileCount,
  totalSize,
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  selectedCount,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
}: FilesHeaderProps) {
  return (
    <div className="border-b border-neutral-200 bg-white">
      {/* Top row */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Files</h1>
          <p className="mt-0.5 text-xs text-neutral-400">
            {fileCount} file{fileCount !== 1 ? "s" : ""} &middot;{" "}
            {formatFileSize(totalSize)}
          </p>
        </div>

        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 rounded-md bg-purple-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-600"
        >
          <Upload className="h-4 w-4" />
          Upload Files
        </button>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 border-t border-neutral-100 px-6 py-2">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files..."
            className="h-8 w-full rounded-md border border-neutral-200 bg-white pl-8 pr-8 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Type filter */}
        <div className="relative">
          <SlidersHorizontal className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <select
            value={filterType}
            onChange={(e) => onFilterTypeChange(e.target.value)}
            className="h-8 appearance-none rounded-md border border-neutral-200 bg-white pl-8 pr-8 text-sm text-neutral-600 outline-none focus:border-purple-300"
          >
            {FILE_TYPE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center rounded-md border border-neutral-200">
          <button
            onClick={() => onViewModeChange("grid")}
            className={`rounded-l-md p-1.5 transition-colors ${
              viewMode === "grid"
                ? "bg-neutral-100 text-neutral-700"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={`rounded-r-md p-1.5 transition-colors ${
              viewMode === "list"
                ? "bg-neutral-100 text-neutral-700"
                : "text-neutral-400 hover:text-neutral-600"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Selection bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3 border-t border-purple-100 bg-purple-50 px-6 py-2">
          <span className="text-xs font-medium text-purple-700">
            {selectedCount} selected
          </span>
          <button
            onClick={onSelectAll}
            className="text-xs text-purple-600 hover:underline"
          >
            Select all
          </button>
          <button
            onClick={onClearSelection}
            className="text-xs text-purple-600 hover:underline"
          >
            Clear
          </button>
          <div className="flex-1" />
          <button
            onClick={onBulkDelete}
            className="flex items-center gap-1 rounded-md bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
