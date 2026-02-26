"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WorkspaceFile } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type SortField = "name" | "created_at" | "file_size" | "file_type";
export type SortOrder = "asc" | "desc";
export type ViewMode = "grid" | "list";

interface UseFilesOptions {
  workspaceId: string | null;
  folderPath?: string;
  sortField?: SortField;
  sortOrder?: SortOrder;
  searchQuery?: string;
  fileType?: string;
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useFiles(options: UseFilesOptions) {
  const {
    workspaceId,
    folderPath,
    sortField = "created_at",
    sortOrder = "desc",
    searchQuery,
    fileType,
  } = options;

  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!workspaceId) {
      setFiles([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      let query = supabase
        .from("workspace_files")
        .select("*")
        .eq("workspace_id", workspaceId);

      if (folderPath) {
        query = query.eq("folder_path", folderPath);
      }

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      if (fileType) {
        query = query.eq("file_type", fileType);
      }

      query = query.order(sortField, { ascending: sortOrder === "asc" });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setFiles((data ?? []) as unknown as WorkspaceFile[]);
    } catch (err) {
      console.error("[useFiles] Error:", err);
      setError("Failed to load files");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, folderPath, sortField, sortOrder, searchQuery, fileType]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return {
    files,
    isLoading,
    error,
    refresh: fetchFiles,
    totalSize: files.reduce((sum, f) => sum + (f.file_size ?? 0), 0),
    totalCount: files.length,
  };
}
