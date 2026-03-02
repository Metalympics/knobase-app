import { NextRequest, NextResponse } from "next/server";
import { withAuth, apiJson, apiError, corsHeaders } from "@/lib/api/auth";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase configuration missing");
  return createClient(url, key);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/* ------------------------------------------------------------------ */
/* GET /api/v1/agents/tasks/:id — get a specific task                  */
/* ------------------------------------------------------------------ */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  const { data: task, error } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !task) {
    return apiError("Task not found", "NOT_FOUND", 404);
  }

  return apiJson({ task });
}

/* ------------------------------------------------------------------ */
/* PATCH /api/v1/agents/tasks/:id — update progress on a task          */
/* ------------------------------------------------------------------ */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return apiError("Invalid JSON body", "INVALID_BODY", 400);
  }

  const supabase = getSupabaseAdmin();

  // Only allow specific fields to be updated
  const allowedFields = [
    "progress_percent",
    "current_action",
    "status",
    "started_at",
    "result_summary",
    "result_blocks",
  ];
  const update: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return apiError("No valid fields to update", "INVALID_BODY", 400);
  }

  const { data: task, error } = await supabase
    .from("agent_tasks")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return apiError("Failed to update task", "INTERNAL_ERROR", 500);
  }

  return apiJson({ task });
}

/* ------------------------------------------------------------------ */
/* POST /api/v1/agents/tasks/:id/complete — mark task as completed     */
/* ------------------------------------------------------------------ */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    /* body is optional */
  }

  const supabase = getSupabaseAdmin();

  const { data: task, error } = await supabase
    .from("agent_tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      progress_percent: 100,
      current_action: null,
      result_summary: (body.result_summary as string) ?? null,
      result_blocks: (body.result_blocks as string[]) ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return apiError("Failed to complete task", "INTERNAL_ERROR", 500);
  }

  return apiJson({ task, message: "Task completed" });
}
