import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, apiJson, apiError, corsHeaders } from "@/lib/api/auth";
import {
  SUPPORTED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  getFileExtension,
} from "@/lib/files/types";

/* ------------------------------------------------------------------ */
/* GET /api/files                                                      */
/* ------------------------------------------------------------------ */

/**
 * List files for the authenticated workspace.
 *
 * Query params:
 *   - folder_path: filter by folder (default: all)
 *   - file_type: filter by extension (e.g. "pdf")
 *   - search: search by file name (ilike)
 *   - sort: field to sort by (name | created_at | file_size | file_type) default: created_at
 *   - order: asc | desc (default: desc)
 *   - limit: max results (default: 100, max: 500)
 *   - offset: pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const { searchParams } = request.nextUrl;

  const workspaceId = auth.apiKey.school_id;
  const folderPath = searchParams.get("folder_path");
  const fileType = searchParams.get("file_type");
  const search = searchParams.get("search");
  const sortField = searchParams.get("sort") ?? "created_at";
  const sortOrder = searchParams.get("order") ?? "desc";
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);
  const offset = Number(searchParams.get("offset") ?? 0);

  // Validate sort field
  const validSortFields = ["name", "created_at", "file_size", "file_type"];
  if (!validSortFields.includes(sortField)) {
    return apiError(
      `Invalid sort field. Must be one of: ${validSortFields.join(", ")}`,
      "INVALID_PARAM",
      400,
    );
  }

  let query = supabase
    .from("workspace_files")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId);

  if (folderPath) {
    query = query.eq("folder_path", folderPath);
  }
  if (fileType) {
    query = query.eq("file_type", fileType);
  }
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  query = query
    .order(sortField, { ascending: sortOrder === "asc" })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("[Files API] List error:", error);
    return apiError("Failed to list files", "INTERNAL_ERROR", 500);
  }

  return apiJson({
    data: data ?? [],
    pagination: {
      total: count ?? 0,
      limit,
      offset,
      hasMore: (count ?? 0) > offset + limit,
    },
  });
}

/* ------------------------------------------------------------------ */
/* POST /api/files                                                     */
/* ------------------------------------------------------------------ */

/**
 * Upload a file via the API.
 * Accepts multipart/form-data with a `file` field.
 *
 * Optional form fields:
 *   - folder_path: destination folder (default: "/")
 *   - description: file description
 *   - tags: comma-separated tags
 */
export async function POST(request: NextRequest) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const workspaceId = auth.apiKey.school_id;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError("Invalid form data. Use multipart/form-data with a 'file' field.", "BAD_REQUEST", 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return apiError("Missing 'file' field", "BAD_REQUEST", 400);
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return apiError(
      `File exceeds 20 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)`,
      "FILE_TOO_LARGE",
      413,
    );
  }

  // Validate extension
  const ext = getFileExtension(file.name);
  if (!SUPPORTED_FILE_EXTENSIONS.includes(ext as (typeof SUPPORTED_FILE_EXTENSIONS)[number])) {
    return apiError(`Unsupported file type: .${ext}`, "UNSUPPORTED_TYPE", 400);
  }

  const folderPath = (formData.get("folder_path") as string) || "/";
  const description = (formData.get("description") as string) || null;
  const tagsRaw = (formData.get("tags") as string) || "";
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const fileId = crypto.randomUUID();
  const storagePath = `${workspaceId}/${fileId}.${ext}`;

  // Upload to Supabase Storage
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from("workspace-files")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("[Files API] Storage upload error:", uploadError);
    return apiError("Failed to upload file to storage", "STORAGE_ERROR", 500);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("workspace-files")
    .getPublicUrl(storagePath);

  // Create DB record
  const { data: fileRecord, error: dbError } = await supabase
    .from("workspace_files")
    .insert({
      id: fileId,
      workspace_id: workspaceId,
      name: file.name,
      file_path: storagePath,
      public_url: urlData.publicUrl,
      file_type: ext,
      file_size: file.size,
      mime_type: file.type || null,
      status: "ready",
      uploaded_by: auth.apiKey.agent_id ?? "api",
      folder_path: folderPath,
      description,
      tags,
    })
    .select()
    .single();

  if (dbError) {
    // Cleanup storage on DB failure
    await supabase.storage.from("workspace-files").remove([storagePath]);
    console.error("[Files API] DB insert error:", dbError);
    return apiError("Failed to save file record", "INTERNAL_ERROR", 500);
  }

  return apiJson({ data: fileRecord }, 201);
}

/* ------------------------------------------------------------------ */
/* DELETE /api/files (bulk)                                            */
/* ------------------------------------------------------------------ */

/**
 * Bulk delete files by IDs.
 * Body: { ids: string[] }
 */
export async function DELETE(request: NextRequest) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const supabase = createAdminClient();
  const workspaceId = auth.apiKey.school_id;

  let body: { ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "BAD_REQUEST", 400);
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return apiError("Missing or empty 'ids' array", "BAD_REQUEST", 400);
  }

  if (body.ids.length > 100) {
    return apiError("Maximum 100 files per delete request", "BAD_REQUEST", 400);
  }

  // Fetch files to get storage paths
  const { data: files, error: fetchError } = await supabase
    .from("workspace_files")
    .select("id, file_path")
    .eq("workspace_id", workspaceId)
    .in("id", body.ids);

  if (fetchError) {
    return apiError("Failed to fetch files", "INTERNAL_ERROR", 500);
  }

  if (!files || files.length === 0) {
    return apiError("No matching files found", "NOT_FOUND", 404);
  }

  // Delete from storage
  const paths = (files as unknown as { id: string; file_path: string }[]).map((f) => f.file_path);
  await supabase.storage.from("workspace-files").remove(paths);

  // Delete DB records
  const fileIds = (files as unknown as { id: string }[]).map((f) => f.id);
  const { error: deleteError } = await supabase
    .from("workspace_files")
    .delete()
    .in("id", fileIds);

  if (deleteError) {
    console.error("[Files API] Delete error:", deleteError);
    return apiError("Failed to delete files", "INTERNAL_ERROR", 500);
  }

  return apiJson({
    deleted: fileIds.length,
    ids: fileIds,
  });
}

/* ------------------------------------------------------------------ */
/* OPTIONS (CORS)                                                      */
/* ------------------------------------------------------------------ */

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
