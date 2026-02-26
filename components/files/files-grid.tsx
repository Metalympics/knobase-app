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
  MoreHorizontal,
  Check,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { formatFileSize, getFileCategory, type FileCategory } from "@/lib/files/types";
import type { WorkspaceFile } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* Icons & colors per category                                         */
/* ------------------------------------------------------------------ */

const CATEGORY_CONFIG: Record<FileCategory, { icon: typeof FileText; color: string; bg: string }> = {
  document: { icon: FileText, color: "text-blue-600", bg: "bg-blue-50" },
  image: { icon: Image, color: "text-pink-600", bg: "bg-pink-50" },
  media: { icon: Music, color: "text-purple-600", bg: "bg-purple-50" },
  data: { icon: Table, color: "text-emerald-600", bg: "bg-emerald-50" },
  archive: { icon: Archive, color: "text-amber-600", bg: "bg-amber-50" },
  other: { icon: File, color: "text-neutral-600", bg: "bg-neutral-50" },
};

function getIcon(fileType: string) {
  const category = getFileCategory(fileType);
  // Override for video
  if (["mp4", "webm", "ogg"].includes(fileType)) {
    return { icon: Video, color: "text-purple-600", bg: "bg-purple-50" };
  }
  return CATEGORY_CONFIG[category];
}

/* ------------------------------------------------------------------ */
/* Grid                                                                */
/* ------------------------------------------------------------------ */

interface FilesGridProps {
  files: WorkspaceFile[];
  selectedFiles: Set<string>;
  onToggleSelect: (id: string) => void;
  onDelete: (file: WorkspaceFile) => void;
  onCopyLink: (file: WorkspaceFile) => void;
}

export function FilesGrid({
  files,
  selectedFiles,
  onToggleSelect,
  onDelete,
  onCopyLink,
}: FilesGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {files.map((file) => (
        <FileCard
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
/* Card                                                                */
/* ------------------------------------------------------------------ */

function FileCard({
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
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { icon: Icon, color, bg } = getIcon(file.file_type);

  const isImage = getFileCategory(file.file_type) === "image";
  const thumbnailUrl = isImage ? file.public_url : null;

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const handleCopy = () => {
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShowMenu(false);
  };

  return (
    <div
      className={`group relative rounded-lg border transition-all hover:shadow-sm ${
        isSelected
          ? "border-purple-400 bg-purple-50 ring-1 ring-purple-200"
          : "border-neutral-200 bg-white hover:border-neutral-300"
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onToggleSelect}
        className={`absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded border transition-all ${
          isSelected
            ? "border-purple-500 bg-purple-500 text-white"
            : "border-neutral-300 bg-white opacity-0 group-hover:opacity-100"
        }`}
      >
        {isSelected && <Check className="h-3 w-3" />}
      </button>

      {/* Menu button */}
      <div className="absolute right-2 top-2 z-10" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex h-6 w-6 items-center justify-center rounded-md bg-white/80 text-neutral-400 opacity-0 transition-all hover:bg-white hover:text-neutral-600 group-hover:opacity-100"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-7 w-40 rounded-md border border-neutral-200 bg-white py-1 shadow-lg">
            <button
              onClick={() => {
                window.open(file.public_url ?? file.file_path, "_blank");
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </button>
            <button
              onClick={handleCopy}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy link"}
            </button>
            <hr className="my-1 border-neutral-100" />
            <button
              onClick={() => {
                onDelete();
                setShowMenu(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Preview area */}
      <div
        className={`flex h-24 items-center justify-center rounded-t-lg ${
          thumbnailUrl ? "" : bg
        }`}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={file.name}
            className="h-full w-full rounded-t-lg object-cover"
            loading="lazy"
          />
        ) : (
          <Icon className={`h-10 w-10 ${color}`} />
        )}
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="truncate text-sm font-medium text-neutral-800" title={file.name}>
          {file.name}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-400">
          <span className="uppercase">{file.file_type}</span>
          <span>&middot;</span>
          <span>{formatFileSize(file.file_size)}</span>
        </div>
      </div>
    </div>
  );
}
