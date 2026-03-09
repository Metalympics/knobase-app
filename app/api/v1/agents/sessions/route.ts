import { NextRequest, NextResponse } from "next/server";
import { withAuth, apiJson, apiError, corsHeaders } from "@/lib/api/auth";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase configuration missing");
  return createClient(url, key);
}

const sessionSchema = z.object({
  agent_id: z.string().min(1).max(100),
  agent_name: z.string().max(100),
  agent_avatar: z.string().max(10).optional(),
  agent_color: z.string().max(20).optional(),
  school_id: z.string().uuid().optional(),
  document_id: z.string().uuid().optional(),
  status: z.enum(["idle", "reading", "thinking", "editing", "waiting"]).optional(),
  current_section: z.string().max(500).optional(),
  current_block_id: z.string().optional(),
  current_task_id: z.string().uuid().optional(),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/* ------------------------------------------------------------------ */
/* POST /api/v1/agents/sessions — upsert agent session / presence      */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "INVALID_BODY", 400);
  }

  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", "VALIDATION_ERROR", 400, {
      issues: parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
  }

  const supabase = getSupabaseAdmin();

  const { data: session, error } = await supabase
    .from("agent_sessions")
    .upsert(
      {
        agent_id: parsed.data.agent_id,
        agent_name: parsed.data.agent_name,
        agent_avatar: parsed.data.agent_avatar ?? null,
        agent_color: parsed.data.agent_color ?? "#8B5CF6",
        school_id: parsed.data.school_id ?? null,
        document_id: parsed.data.document_id ?? null,
        status: parsed.data.status ?? "idle",
        current_section: parsed.data.current_section ?? null,
        current_block_id: parsed.data.current_block_id ?? null,
        current_task_id: parsed.data.current_task_id ?? null,
      },
      { onConflict: "agent_id" },
    )
    .select()
    .single();

  if (error) {
    return apiError("Failed to upsert session", "INTERNAL_ERROR", 500);
  }

  return apiJson({ session });
}
