import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/public/pages?slug=<public_slug>&domain=<custom_domain>
 *   Returns a single public page by slug, optionally scoped to a domain's workspace.
 *
 * GET /api/public/pages?school=<school_id>
 *   Lists all public pages for a workspace.
 *
 * GET /api/public/pages?domain=<custom_domain>
 *   Resolves workspace by custom_domain and lists all its public pages.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = request.nextUrl;

    const slug = searchParams.get("slug");
    const domain = searchParams.get("domain");
    let schoolId = searchParams.get("school");

    // Resolve domain → workspace if provided
    let workspace: { id: string; name: string } | null = null;
    if (domain) {
      const { data: school, error: schoolError } = await supabase
        .from("schools")
        .select("id, name, is_public_workspace")
        .eq("custom_domain", domain)
        .single();

      if (schoolError || !school || !school.is_public_workspace) {
        return NextResponse.json(
          { error: "Workspace not found for this domain" },
          { status: 404 }
        );
      }

      workspace = { id: school.id, name: school.name };
      if (!schoolId) schoolId = school.id;
    }

    if (slug) {
      const query = supabase
        .from("pages")
        .select("id, title, content_md, updated_at, is_public, public_slug, school_id")
        .eq("public_slug", slug)
        .eq("is_public", true);

      if (schoolId) query.eq("school_id", schoolId);

      const { data: page, error } = await query.single();

      if (error || !page) {
        return NextResponse.json(
          { error: "Page not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        id: page.id,
        title: page.title,
        content_md: page.content_md,
        updated_at: page.updated_at,
        workspace: workspace ?? undefined,
      });
    }

    if (schoolId) {
      const { data: pages, error } = await supabase
        .from("pages")
        .select("id, title, public_slug, updated_at")
        .eq("school_id", schoolId)
        .eq("is_public", true)
        .order("updated_at", { ascending: false });

      if (error) {
        return NextResponse.json(
          { error: "Failed to fetch pages" },
          { status: 500 }
        );
      }

      // If we resolved workspace from domain, include that info
      if (!workspace && schoolId) {
        const { data: school } = await supabase
          .from("schools")
          .select("id, name")
          .eq("id", schoolId)
          .single();
        if (school) workspace = { id: school.id, name: school.name };
      }

      return NextResponse.json({
        pages: pages ?? [],
        workspace: workspace ?? undefined,
      });
    }

    return NextResponse.json(
      { error: "Provide ?slug=, ?school=, or ?domain= query parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("GET /api/public/pages error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
