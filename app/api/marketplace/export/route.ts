import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { exportWorkspaceAsManifest } from "@/lib/marketplace/import";

/**
 * GET /api/marketplace/export?workspaceId=...
 * Export workspace content as an OpenclawManifest for pack creation.
 * Requires auth + membership in the workspace.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = new URL(request.url).searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId query param required" },
        { status: 400 }
      );
    }

    // Verify user has access to the workspace
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const userId = (profile as unknown as { id: string }).id;

    const { data: membership } = await supabase
      .from("users")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this workspace" },
        { status: 403 }
      );
    }

    const manifest = await exportWorkspaceAsManifest(workspaceId);
    return NextResponse.json(manifest);
  } catch (error) {
    console.error("[Marketplace] Export error:", error);
    return NextResponse.json(
      { error: "Failed to export workspace" },
      { status: 500 }
    );
  }
}
