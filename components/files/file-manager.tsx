"use client";

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { useFiles, type SortField, type SortOrder, type ViewMode } from "@/hooks/use-files";
import { uploadFile, deleteFile, deleteFiles } from "@/lib/files/upload";
import { SUPPORTED_MIME_TYPES, formatFileSize } from "@/lib/files/types";
import { getActiveWorkspaceId, getOrCreateDefaultWorkspace } from "@/lib/schools/store";
import { FilesHeader } from "./files-header";
import { FilesGrid } from "./files-grid";
import { FilesList } from "./files-list";
import { FilesEmpty } from "./files-empty";
import { UploadProgressPanel } from "./upload-progress";
import type { UploadProgress } from "@/lib/files/types";
import type { WorkspaceFile } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* File Manager                                                        */
/* ------------------------------------------------------------------ */

export function FileManager() {
  // Workspace
  const [workspaceId] = useState<string>(() => {
    const id = getActiveWorkspaceId();
    if (id) return id;
    return getOrCreateDefaultWorkspace().id;
  });
  const userId = typeof window !== "undefined"
    ? localStorage.getItem("knobase-app:current-user-id") ?? "local-user"
    : "local-user";

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>("");

  // Upload progress
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const uploadCounter = useRef(0);

  // Files data
  const { files, isLoading, error, refresh, totalSize, totalCount } = useFiles({
    workspaceId,
    sortField,
    sortOrder,
    searchQuery: searchQuery || undefined,
    fileType: filterType || undefined,
  });

  // ── Upload ──

  const handleUpload = useCallback(async (acceptedFiles: File[]) => {
    const newUploads: UploadProgress[] = acceptedFiles.map((f) => ({
      fileId: `pending-${++uploadCounter.current}`,
      fileName: f.name,
      progress: 0,
      status: "uploading" as const,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const uploadId = newUploads[i].fileId;

      try {
        await uploadFile(file, workspaceId, userId, {
          onProgress: (pct) => {
            setUploads((prev) =>
              prev.map((u) => (u.fileId === uploadId ? { ...u, progress: pct } : u)),
            );
          },
        });

        setUploads((prev) =>
          prev.map((u) =>
            u.fileId === uploadId ? { ...u, progress: 100, status: "done" as const } : u,
          ),
        );
      } catch (err) {
        setUploads((prev) =>
          prev.map((u) =>
            u.fileId === uploadId
              ? { ...u, status: "error" as const, error: err instanceof Error ? err.message : "Upload failed" }
              : u,
          ),
        );
      }
    }

    refresh();

    // Auto-clear completed uploads after 3s
    setTimeout(() => {
      setUploads((prev) => prev.filter((u) => u.status !== "done"));
    }, 3000);
  }, [workspaceId, userId, refresh]);

  // ── Dropzone ──

  const acceptMimeTypes: Record<string, string[]> = {};
  for (const [mime] of Object.entries(SUPPORTED_MIME_TYPES)) {
    acceptMimeTypes[mime] = [];
  }

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleUpload,
    noClick: true,
    maxSize: 20 * 1024 * 1024,
    accept: acceptMimeTypes,
  });

  // ── Paste handler ──

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        handleUpload(pastedFiles);
      }
    },
    [handleUpload],
  );

  // ── Selection ──

  const toggleSelect = useCallback((fileId: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map((f) => f.id)));
    }
  }, [files, selectedFiles.size]);

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set());
  }, []);

  // ── Delete ──

  const handleDelete = useCallback(async (file: WorkspaceFile) => {
    if (!confirm(`Delete "${file.name}"?`)) return;
    try {
      await deleteFile(file.id, file.file_path);
      refresh();
    } catch {
      // Error handled in deleteFile
    }
  }, [refresh]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedFiles.size === 0) return;
    if (!confirm(`Delete ${selectedFiles.size} file(s)?`)) return;

    const toDelete = files
      .filter((f) => selectedFiles.has(f.id))
      .map((f) => ({ id: f.id, filePath: f.file_path }));

    await deleteFiles(toDelete);
    setSelectedFiles(new Set());
    refresh();
  }, [selectedFiles, files, refresh]);

  // ── Copy link ──

  const handleCopyLink = useCallback((file: WorkspaceFile) => {
    const url = file.public_url ?? file.file_path;
    navigator.clipboard.writeText(url);
  }, []);

  // ── Sort ──

  const handleSort = useCallback((field: SortField) => {
    if (field === sortField) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }, [sortField]);

  return (
    <div
      {...getRootProps()}
      onPaste={handlePaste}
      tabIndex={0}
      className="relative flex h-full flex-col outline-none"
    >
      <input {...getInputProps()} />

      {/* Drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-4 border-dashed border-purple-400 bg-purple-50/80 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-4xl">📁</div>
            <p className="mt-2 text-lg font-medium text-purple-700">
              Drop files here to upload
            </p>
            <p className="mt-1 text-sm text-purple-500">Max 20 MB per file</p>
          </div>
        </div>
      )}

      {/* Header */}
      <FilesHeader
        onUploadClick={open}
        fileCount={totalCount}
        totalSize={totalSize}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterType={filterType}
        onFilterTypeChange={setFilterType}
        selectedCount={selectedFiles.size}
        onSelectAll={selectAll}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <FilesLoading viewMode={viewMode} />
        ) : files.length === 0 ? (
          <FilesEmpty onUpload={open} hasSearch={!!searchQuery || !!filterType} />
        ) : viewMode === "grid" ? (
          <FilesGrid
            files={files}
            selectedFiles={selectedFiles}
            onToggleSelect={toggleSelect}
            onDelete={handleDelete}
            onCopyLink={handleCopyLink}
          />
        ) : (
          <FilesList
            files={files}
            selectedFiles={selectedFiles}
            onToggleSelect={toggleSelect}
            onDelete={handleDelete}
            onCopyLink={handleCopyLink}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        )}
      </div>

      {/* Upload progress */}
      {uploads.length > 0 && <UploadProgressPanel uploads={uploads} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading skeleton                                                    */
/* ------------------------------------------------------------------ */

function FilesLoading({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "list") {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-md bg-neutral-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="h-36 animate-pulse rounded-lg bg-neutral-100" />
      ))}
    </div>
  );
}
