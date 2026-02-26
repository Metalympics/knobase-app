"use client";

import { CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import type { UploadProgress } from "@/lib/files/types";

interface UploadProgressPanelProps {
  uploads: UploadProgress[];
}

export function UploadProgressPanel({ uploads }: UploadProgressPanelProps) {
  const activeUploads = uploads.filter((u) => u.status === "uploading");
  const completedUploads = uploads.filter((u) => u.status === "done");
  const failedUploads = uploads.filter((u) => u.status === "error");

  return (
    <div className="absolute bottom-4 right-4 z-40 w-80 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5">
        <span className="text-xs font-medium text-neutral-700">
          {activeUploads.length > 0
            ? `Uploading ${activeUploads.length} file${activeUploads.length > 1 ? "s" : ""}...`
            : failedUploads.length > 0
              ? `${failedUploads.length} failed`
              : `${completedUploads.length} uploaded`}
        </span>
      </div>

      {/* Upload items */}
      <div className="max-h-60 overflow-y-auto">
        {uploads.map((upload) => (
          <div
            key={upload.fileId}
            className="flex items-center gap-2.5 border-b border-neutral-50 px-4 py-2 last:border-b-0"
          >
            {/* Status icon */}
            {upload.status === "uploading" && (
              <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
            )}
            {upload.status === "done" && (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            )}
            {upload.status === "error" && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-neutral-700">{upload.fileName}</p>
              {upload.status === "uploading" && (
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
              {upload.status === "error" && (
                <p className="mt-0.5 truncate text-[10px] text-red-500">{upload.error}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
