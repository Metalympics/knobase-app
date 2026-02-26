import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { parseManifest, importOpenclawPackage } from "@/lib/marketplace/import";
import { sanitizePackage } from "@/lib/marketplace/sanitizer";

/**
 * POST /api/marketplace/import — Import an .openclaw file into a workspace
 *
 * Body (JSON):
 * {
 *   manifest: string | object,   // Raw JSON string or parsed manifest
 *   workspaceId?: string,        // Existing workspace to import into
 *   newWorkspaceName?: string,   // Or create a new workspace
 *   selectedAgentIds?: string[],
 *   selectedDocumentIds?: string[],
 *   sanitize?: boolean,          // Run sanitizer before import (default: false)
 *   originalFilename?: string,
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up internal user ID
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const userId = (profile as unknown as { id: string }).id;
    const body = await request.json();

    // Parse manifest
    let manifest = typeof body.manifest === "string"
      ? parseManifest(body.manifest)
      : parseManifest(JSON.stringify(body.manifest));

    // Optional sanitization
    if (body.sanitize) {
      const sanitized = sanitizePackage(manifest);
      manifest = sanitized.manifest;
      if (sanitized.issues.some((i) => i.severity === "error")) {
        return NextResponse.json({
          error: "Sanitization found critical issues",
          issues: sanitized.issues,
        }, { status: 400 });
      }
    }

    if (!body.workspaceId && !body.newWorkspaceName) {
      return NextResponse.json(
        { error: "workspaceId or newWorkspaceName required" },
        { status: 400 }
      );
    }

    const result = await importOpenclawPackage(manifest, userId, {
      workspaceId: body.workspaceId,
      newWorkspaceName: body.newWorkspaceName,
      selectedAgentIds: body.selectedAgentIds,
      selectedDocumentIds: body.selectedDocumentIds,
      sourceType: "file_upload",
      originalFilename: body.originalFilename,
    });

    return NextResponse.json(result, { status: result.success ? 200 : 207 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import failed";
    console.error("[Marketplace] Import error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
