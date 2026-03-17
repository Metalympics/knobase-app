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
    .select("id, type, school_id, is_suspended")
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

  return { ok: true as const };
}

/**
 * GET /api/agents/[id]/files
 *
 * Returns all files for the given agent.
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
    .select("filename, content, updated_at")
    .eq("agent_id", agentId)
    .order("filename");

  if (error) {
    console.error("[Agent Files GET] Error:", error);
    return apiError("Failed to list agent files", "INTERNAL_ERROR", 500);
  }

  return apiJson({ files: data ?? [] });
}

/**
 * POST /api/agents/[id]/files
 *
 * Upsert a file for the given agent. Creates the file if it doesn't exist,
 * or updates it if a file with the same filename already exists.
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

  const { error } = await supabase
    .from("agent_files")
    .upsert(
      { agent_id: agentId, filename, content, updated_at: now },
      { onConflict: "agent_id,filename" },
    );

  if (error) {
    console.error("[Agent Files POST] Error:", error);
    return apiError("Failed to upsert agent file", "INTERNAL_ERROR", 500);
  }

  return apiJson({ success: true, filename, updated_at: now }, 201);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
