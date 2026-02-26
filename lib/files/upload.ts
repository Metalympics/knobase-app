// ── File Upload Utility ──
// Upload files to Supabase Storage and create workspace_files records.

import { createClient } from "@/lib/supabase/client";
import {
  SUPPORTED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  getFileExtension,
  type UploadResult,
} from "./types";

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File exceeds 20 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)` };
  }

  const ext = getFileExtension(file.name);
  if (!SUPPORTED_FILE_EXTENSIONS.includes(ext as typeof SUPPORTED_FILE_EXTENSIONS[number])) {
    return { valid: false, error: `Unsupported file type: .${ext}` };
  }

  return { valid: true };
}

/* ------------------------------------------------------------------ */
/* Upload                                                              */
/* ------------------------------------------------------------------ */

/**
 * Upload a single file to Supabase Storage and create a workspace_files record.
 *
 * Storage bucket: `workspace-files`
 * Path format: `{workspaceId}/{fileId}.{ext}`
 */
export async function uploadFile(
  file: File,
  workspaceId: string,
  userId: string,
  options?: {
    folderPath?: string;
    description?: string;
    tags?: string[];
    onProgress?: (progress: number) => void;
  },
): Promise<UploadResult> {
  const supabase = createClient();

  // Validate
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const fileId = crypto.randomUUID();
  const ext = getFileExtension(file.name);
  const storagePath = `${workspaceId}/${fileId}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("workspace-files")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`);
  }

  // Progress: upload complete
  options?.onProgress?.(80);

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("workspace-files")
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  // Create DB record
  const { error: dbError } = await supabase
    .from("workspace_files")
    .insert({
      id: fileId,
      workspace_id: workspaceId,
      name: file.name,
      file_path: storagePath,
      public_url: publicUrl,
      file_type: ext,
      file_size: file.size,
      mime_type: file.type || null,
      status: "ready",
      uploaded_by: userId,
      folder_path: options?.folderPath ?? "/",
      description: options?.description ?? null,
      tags: options?.tags ?? [],
    });

  if (dbError) {
    // Cleanup storage on DB failure
    await supabase.storage.from("workspace-files").remove([storagePath]);
    throw new Error(`Failed to save file record: ${dbError.message}`);
  }

  options?.onProgress?.(100);

  return {
    fileId,
    fileName: file.name,
    filePath: storagePath,
    publicUrl,
    fileType: ext,
    fileSize: file.size,
  };
}

/* ------------------------------------------------------------------ */
/* Delete                                                              */
/* ------------------------------------------------------------------ */

/**
 * Delete a file from both Storage and DB.
 */
export async function deleteFile(fileId: string, filePath: string): Promise<void> {
  const supabase = createClient();

  // Delete from storage (non-blocking)
  supabase.storage.from("workspace-files").remove([filePath]).catch(() => {});

  // Delete DB record
  const { error } = await supabase
    .from("workspace_files")
    .delete()
    .eq("id", fileId);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Bulk delete files.
 */
export async function deleteFiles(files: { id: string; filePath: string }[]): Promise<{
  succeeded: number;
  failed: number;
}> {
  const results = await Promise.allSettled(
    files.map(({ id, filePath }) => deleteFile(id, filePath)),
  );

  return {
    succeeded: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  };
}

/* ------------------------------------------------------------------ */
/* Rename / Update                                                     */
/* ------------------------------------------------------------------ */

export async function renameFile(fileId: string, newName: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("workspace_files")
    .update({ name: newName })
    .eq("id", fileId);

  if (error) throw new Error(`Failed to rename: ${error.message}`);
}

export async function updateFileTags(fileId: string, tags: string[]): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("workspace_files")
    .update({ tags })
    .eq("id", fileId);

  if (error) throw new Error(`Failed to update tags: ${error.message}`);
}
