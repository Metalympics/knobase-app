import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, corsHeaders, apiJson, apiError } from "@/lib/api/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function verifyAgent(
  agentId: string,
  schoolId: string,
) {
  const supabase = createAdminClient();

  const { data: existing, error } = await supabase
    .from("users")
    .select("id, type, school_id, is_suspended, display_name, name")
    .eq("id", agentId)
    .single();

  if (error || !existing) {
    return { ok: false as const, response: apiError("Agent not found", "NOT_FOUND", 404) };
  }

  const row = existing as unknown as {
    id: string;
    type: string | null;
    school_id: string | null;
    is_suspended: boolean;
    display_name: string | null;
    name: string | null;
  };

  if (row.type !== "agent") {
    return { ok: false as const, response: apiError("Resource is not an agent", "BAD_REQUEST", 400) };
  }
  if (row.school_id !== schoolId) {
    return { ok: false as const, response: apiError("Agent does not belong to this workspace", "FORBIDDEN", 403) };
  }
  if (row.is_suspended) {
    return { ok: false as const, response: apiError("Agent is suspended", "FORBIDDEN", 403) };
  }

  return {
    ok: true as const,
    agentName: row.display_name || row.name || "Agent",
  };
}

/**
 * GET /api/agents/[id]/files
 *
 * Returns all linked pages for the given agent with their titles, IDs, and filenames.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id: agentId } = await context.params;
  const { school_id } = auth.apiKey;

  const check = await verifyAgent(agentId, school_id);
  if (!check.ok) return check.response;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("agent_files")
    .select("filename, page_id, updated_at, pages!inner(id, title)")
    .eq("agent_id", agentId)
    .order("filename");

  if (error) {
    console.error("[Agent Files GET] Error:", error);
    return apiError("Failed to list agent files", "INTERNAL_ERROR", 500);
  }

  const files = (data ?? []).map((row) => {
    const page = row.pages as unknown as { id: string; title: string };
    return {
      filename: row.filename,
      page_id: row.page_id,
      page_title: page.title,
      updated_at: row.updated_at,
    };
  });

  return apiJson({ files });
}

/**
 * POST /api/agents/[id]/files
 *
 * Creates a new Knobase page with the provided content, then links it
 * to the agent via agent_files. If a file with the same filename already
 * exists, the linked page's content is updated instead.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id: agentId } = await context.params;
  const { school_id } = auth.apiKey;

  const check = await verifyAgent(agentId, school_id);
  if (!check.ok) return check.response;

  let body: { filename?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "BAD_REQUEST", 400);
  }

  const { filename, content } = body;

  if (!filename || typeof filename !== "string") {
    return apiError("filename is required and must be a string", "BAD_REQUEST", 400);
  }
  if (content === undefined || typeof content !== "string") {
    return apiError("content is required and must be a string", "BAD_REQUEST", 400);
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: existingLink } = await supabase
    .from("agent_files")
    .select("id, page_id")
    .eq("agent_id", agentId)
    .eq("filename", filename)
    .maybeSingle();

  if (existingLink) {
    const { error: updateErr } = await supabase
      .from("pages")
      .update({ content_md: content })
      .eq("id", existingLink.page_id);

    if (updateErr) {
      console.error("[Agent Files POST] Page update error:", updateErr);
      return apiError("Failed to update page content", "INTERNAL_ERROR", 500);
    }

    const { error: linkErr } = await supabase
      .from("agent_files")
      .update({ updated_at: now })
      .eq("id", existingLink.id);

    if (linkErr) {
      console.error("[Agent Files POST] Link update error:", linkErr);
    }

    return apiJson({
      success: true,
      filename,
      page_id: existingLink.page_id,
      updated_at: now,
    });
  }

  const stripExt = filename.replace(/\.[^/.]+$/, "");
  const pageTitle = `${stripExt} - ${check.agentName}`;

  const { data: page, error: pageErr } = await supabase
    .from("pages")
    .insert({
      school_id,
      created_by: agentId,
      title: pageTitle,
      content_md: content,
      visibility: "shared" as const,
    })
    .select("id")
    .single();

  if (pageErr || !page) {
    console.error("[Agent Files POST] Page creation error:", pageErr);
    return apiError("Failed to create page", "INTERNAL_ERROR", 500);
  }

  const { error: linkErr } = await supabase
    .from("agent_files")
    .insert({
      agent_id: agentId,
      page_id: page.id,
      filename,
      updated_at: now,
    });

  if (linkErr) {
    console.error("[Agent Files POST] Link creation error:", linkErr);
    return apiError("Failed to link page to agent", "INTERNAL_ERROR", 500);
  }

  return apiJson({
    success: true,
    filename,
    page_id: page.id,
    page_title: pageTitle,
    updated_at: now,
  }, 201);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
