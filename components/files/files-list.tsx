"use client";

import {
  FileText,
  Image,
  Music,
  Video,
  Table,
  Archive,
  File,
  Copy,
  Trash2,
  ExternalLink,
  Check,
  ArrowUpDown,
} from "lucide-react";
import { useState } from "react";
import { formatFileSize, getFileCategory, type FileCategory } from "@/lib/files/types";
import type { WorkspaceFile } from "@/lib/supabase/types";
import type { SortField, SortOrder } from "@/hooks/use-files";

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const CATEGORY_ICON: Record<FileCategory, typeof FileText> = {
  document: FileText,
  image: Image,
  media: Music,
  data: Table,
  archive: Archive,
  other: File,
};

function getIconForType(fileType: string) {
  if (["mp4", "webm", "ogg"].includes(fileType)) return Video;
  return CATEGORY_ICON[getFileCategory(fileType)];
}

/* ------------------------------------------------------------------ */
/* List view                                                           */
/* ------------------------------------------------------------------ */

interface FilesListProps {
  files: WorkspaceFile[];
  selectedFiles: Set<string>;
  onToggleSelect: (id: string) => void;
  onDelete: (file: WorkspaceFile) => void;
  onCopyLink: (file: WorkspaceFile) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

export function FilesList({
  files,
  selectedFiles,
  onToggleSelect,
  onDelete,
  onCopyLink,
  sortField,
  sortOrder,
  onSort,
}: FilesListProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200">
      {/* Header */}
      <div className="grid grid-cols-[auto_1fr_100px_100px_140px_80px] gap-4 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
        <div className="w-5" />
        <SortHeader label="Name" field="name" current={sortField} order={sortOrder} onSort={onSort} />
        <SortHeader label="Type" field="file_type" current={sortField} order={sortOrder} onSort={onSort} />
        <SortHeader label="Size" field="file_size" current={sortField} order={sortOrder} onSort={onSort} />
        <SortHeader label="Uploaded" field="created_at" current={sortField} order={sortOrder} onSort={onSort} />
        <div />
      </div>

      {/* Rows */}
      {files.map((file) => (
        <FileRow
          key={file.id}
          file={file}
          isSelected={selectedFiles.has(file.id)}
          onToggleSelect={() => onToggleSelect(file.id)}
          onDelete={() => onDelete(file)}
          onCopyLink={() => onCopyLink(file)}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sort header                                                         */
/* ------------------------------------------------------------------ */

function SortHeader({
  label,
  field,
  current,
  order,
  onSort,
}: {
  label: string;
  field: SortField;
  current: SortField;
  order: SortOrder;
  onSort: (f: SortField) => void;
}) {
  const isActive = current === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-left ${isActive ? "text-neutral-700" : ""}`}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${isActive ? "text-purple-500" : "text-neutral-300"}`} />
      {isActive && <span className="text-[10px] text-purple-400">{order === "asc" ? "↑" : "↓"}</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

function FileRow({
  file,
  isSelected,
  onToggleSelect,
  onDelete,
  onCopyLink,
}: {
  file: WorkspaceFile;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const Icon = getIconForType(file.file_type);
  const category = getFileCategory(file.file_type);

  const colorMap: Record<FileCategory, string> = {
    document: "text-blue-500",
    image: "text-pink-500",
    media: "text-purple-500",
    data: "text-emerald-500",
    archive: "text-amber-500",
    other: "text-neutral-500",
  };

  const handleCopy = () => {
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(file.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={`group grid grid-cols-[auto_1fr_100px_100px_140px_80px] items-center gap-4 border-b border-neutral-100 px-4 py-2.5 transition-colors last:border-b-0 ${
        isSelected ? "bg-purple-50" : "hover:bg-neutral-50"
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggleSelect}
        className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
          isSelected
            ? "border-purple-500 bg-purple-500 text-white"
            : "border-neutral-300 bg-white"
        }`}
      >
        {isSelected && <Check className="h-2.5 w-2.5" />}
      </button>

      {/* Name */}
      <div className="flex items-center gap-2.5 overflow-hidden">
        <Icon className={`h-4 w-4 flex-shrink-0 ${colorMap[category]}`} />
        <span className="truncate text-sm text-neutral-800">{file.name}</span>
      </div>

      {/* Type */}
      <span className="text-xs uppercase text-neutral-500">{file.file_type}</span>

      {/* Size */}
      <span className="text-xs text-neutral-500">{formatFileSize(file.file_size)}</span>

      {/* Date */}
      <span className="text-xs text-neutral-500">{formattedDate}</span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => window.open(file.public_url ?? file.file_path, "_blank")}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          title="Open"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleCopy}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          title="Copy link"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
