import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, apiJson, apiError, corsHeaders } from "@/lib/api/auth";

/* ------------------------------------------------------------------ */
/* GET /api/files/[id]                                                 */
/* ------------------------------------------------------------------ */

/**
 * Get a single file record by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const supabase = createAdminClient();
  const workspaceId = auth.apiKey.workspace_id;

  const { data, error } = await supabase
    .from("workspace_files")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !data) {
    return apiError("File not found", "NOT_FOUND", 404);
  }

  return apiJson({ data });
}

/* ------------------------------------------------------------------ */
/* PATCH /api/files/[id]                                               */
/* ------------------------------------------------------------------ */

/**
 * Update file metadata (name, description, tags, folder_path).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const supabase = createAdminClient();
  const workspaceId = auth.apiKey.workspace_id;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "BAD_REQUEST", 400);
  }

  // Whitelist updatable fields
  const allowedFields = ["name", "description", "tags", "folder_path"] as const;
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return apiError(
      `No valid fields to update. Allowed: ${allowedFields.join(", ")}`,
      "BAD_REQUEST",
      400,
    );
  }

  // Validate name if present
  if (updates.name && (typeof updates.name !== "string" || updates.name.trim().length === 0)) {
    return apiError("Name must be a non-empty string", "BAD_REQUEST", 400);
  }

  // Validate tags if present
  if (updates.tags && !Array.isArray(updates.tags)) {
    return apiError("Tags must be an array of strings", "BAD_REQUEST", 400);
  }

  const { data, error } = await supabase
    .from("workspace_files")
    .update(updates)
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error) {
    console.error("[Files API] Update error:", error);
    return apiError("Failed to update file", "INTERNAL_ERROR", 500);
  }

  if (!data) {
    return apiError("File not found", "NOT_FOUND", 404);
  }

  return apiJson({ data });
}

/* ------------------------------------------------------------------ */
/* DELETE /api/files/[id]                                              */
/* ------------------------------------------------------------------ */

/**
 * Delete a single file from both Storage and DB.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const supabase = createAdminClient();
  const workspaceId = auth.apiKey.workspace_id;

  // Fetch file to get storage path
  const { data: file, error: fetchError } = await supabase
    .from("workspace_files")
    .select("id, file_path")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .single();

  if (fetchError || !file) {
    return apiError("File not found", "NOT_FOUND", 404);
  }

  const row = file as unknown as { id: string; file_path: string };

  // Remove from storage
  await supabase.storage.from("workspace-files").remove([row.file_path]);

  // Remove DB record
  const { error: deleteError } = await supabase
    .from("workspace_files")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("[Files API] Delete error:", deleteError);
    return apiError("Failed to delete file", "INTERNAL_ERROR", 500);
  }

  return apiJson({ deleted: true, id });
}

/* ------------------------------------------------------------------ */
/* OPTIONS (CORS)                                                      */
/* ------------------------------------------------------------------ */

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
