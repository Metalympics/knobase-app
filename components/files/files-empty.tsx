"use client";

import { Upload, FolderOpen, Search } from "lucide-react";

interface FilesEmptyProps {
  onUpload: () => void;
  hasSearch?: boolean;
}

export function FilesEmpty({ onUpload, hasSearch }: FilesEmptyProps) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
          <Search className="h-7 w-7 text-neutral-400" />
        </div>
        <h3 className="mt-4 text-sm font-medium text-neutral-700">No files match your search</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Try a different search term or clear your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-50">
        <FolderOpen className="h-7 w-7 text-purple-400" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-neutral-700">No files yet</h3>
      <p className="mt-1 max-w-sm text-center text-xs text-neutral-500">
        Upload files to store them centrally. You can drag &amp; drop, paste
        screenshots, or click the button below.
      </p>
      <button
        onClick={onUpload}
        className="mt-5 flex items-center gap-2 rounded-md bg-purple-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-600"
      >
        <Upload className="h-4 w-4" />
        Upload your first file
      </button>

      <div className="mt-8 grid max-w-md grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg">📄</div>
          <p className="mt-1 text-xs text-neutral-500">Documents</p>
          <p className="text-[10px] text-neutral-400">PDF, DOCX, TXT</p>
        </div>
        <div>
          <div className="text-lg">🖼️</div>
          <p className="mt-1 text-xs text-neutral-500">Images</p>
          <p className="text-[10px] text-neutral-400">PNG, JPG, SVG</p>
        </div>
        <div>
          <div className="text-lg">📊</div>
          <p className="mt-1 text-xs text-neutral-500">Data</p>
          <p className="text-[10px] text-neutral-400">CSV, XLSX, JSON</p>
        </div>
      </div>
    </div>
  );
}
