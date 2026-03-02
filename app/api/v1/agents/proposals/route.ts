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

const proposalSchema = z.object({
  task_id: z.string().uuid(),
  document_id: z.string().uuid(),
  block_id: z.string().optional(),
  edit_type: z.enum(["insert", "replace", "delete", "append", "prepend", "transform"]),
  original_content: z.record(z.string(), z.unknown()).nullable().optional(),
  proposed_content: z.record(z.string(), z.unknown()),
  explanation: z.string().max(2_000).optional(),
  surrounding_context: z.string().max(5_000).optional(),
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/* ------------------------------------------------------------------ */
/* POST /api/v1/agents/proposals — create an edit proposal             */
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

  const parsed = proposalSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", "VALIDATION_ERROR", 400, {
      issues: parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
  }

  const supabase = getSupabaseAdmin();

  const { data: proposal, error } = await supabase
    .from("agent_edit_proposals")
    .insert({
      task_id: parsed.data.task_id,
      document_id: parsed.data.document_id,
      block_id: parsed.data.block_id ?? null,
      edit_type: parsed.data.edit_type,
      original_content: parsed.data.original_content ?? null,
      proposed_content: parsed.data.proposed_content,
      explanation: parsed.data.explanation ?? null,
      surrounding_context: parsed.data.surrounding_context ?? null,
    })
    .select()
    .single();

  if (error) {
    return apiError("Failed to create proposal", "INTERNAL_ERROR", 500);
  }

  return apiJson({ proposal }, 201);
}
