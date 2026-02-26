import { NextRequest, NextResponse } from "next/server";
import { withAuth, apiJson, apiError, corsHeaders } from "@/lib/api/auth";
import { z } from "zod";
import {
  beginWork,
  completeWithResult,
  submitProposalsAndComplete,
  reportProgress,
  handleFailure,
  dequeueNextTask,
} from "@/lib/agents/task-coordinator";
import {
  upsertSession,
} from "@/lib/supabase/sessions";
import {
  createProposal,
} from "@/lib/supabase/proposals";
import { dispatchWebhookEvent } from "@/lib/webhooks/outbound";

/* ------------------------------------------------------------------ */
/* Validation schemas                                                  */
/* ------------------------------------------------------------------ */

const agentWebhookSchema = z.object({
  agent_id: z.string().min(1).max(100),
  workspace_id: z.string().uuid(),
  document_id: z.string().uuid().optional(),
  action: z.enum([
    "get_task",
    "submit_result",
    "update_progress",
    "create_proposal",
    "update_session",
  ]),
  payload: z.record(z.string(), z.unknown()).default({}),
});

const submitResultPayload = z.object({
  task_id: z.string().uuid(),
  result_summary: z.string().max(10_000),
  result_blocks: z.array(z.string()).optional(),
});

const updateProgressPayload = z.object({
  task_id: z.string().uuid(),
  progress_percent: z.number().min(0).max(100),
  current_action: z.string().max(500).optional(),
  status: z.enum(["working", "acknowledged"]).optional(),
});

const createProposalPayload = z.object({
  task_id: z.string().uuid(),
  document_id: z.string().uuid(),
  block_id: z.string().optional(),
  edit_type: z.enum(["insert", "replace", "delete", "append", "prepend", "transform"]),
  original_content: z.record(z.string(), z.unknown()).nullable().optional(),
  proposed_content: z.record(z.string(), z.unknown()),
  explanation: z.string().max(2_000).optional(),
  surrounding_context: z.string().max(5_000).optional(),
});

const updateSessionPayload = z.object({
  agent_name: z.string().max(100),
  agent_avatar: z.string().max(10).optional(),
  agent_color: z.string().max(20).optional(),
  document_id: z.string().uuid().optional(),
  status: z.enum(["idle", "reading", "thinking", "editing", "waiting"]).optional(),
  current_section: z.string().max(500).optional(),
  current_block_id: z.string().optional(),
});

/* ------------------------------------------------------------------ */
/* CORS preflight                                                      */
/* ------------------------------------------------------------------ */

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/* ------------------------------------------------------------------ */
/* POST /api/v1/agents/webhook                                         */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  // 1. Authenticate (async — Supabase-backed API key lookup)
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  // 2. Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "INVALID_BODY", 400);
  }

  const parsed = agentWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", "VALIDATION_ERROR", 400, {
      issues: parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      })),
    });
  }

  const { agent_id, workspace_id, document_id, action, payload } = parsed.data;

  try {
    switch (action) {
      /* ---------------------------------------------------------- */
      /* get_task — return next pending task for this agent           */
      /* Uses task-coordinator's dequeueNextTask + beginWork          */
      /* ---------------------------------------------------------- */
      case "get_task": {
        const task = await dequeueNextTask(agent_id);

        if (!task) {
          return apiJson({ task: null, message: "No pending tasks" });
        }

        // Auto-begin work (acknowledge + start)
        const started = await beginWork(task.id, {
          agentId: agent_id,
          agentName: agent_id, // agents supply their name via update_session
        });

        return apiJson({ task: started });
      }

      /* ---------------------------------------------------------- */
      /* submit_result — mark a task as completed                    */
      /* Uses task-coordinator's completeWithResult or               */
      /* submitProposalsAndComplete                                   */
      /* ---------------------------------------------------------- */
      case "submit_result": {
        const r = submitResultPayload.safeParse(payload);
        if (!r.success) {
          return apiError("Invalid submit_result payload", "VALIDATION_ERROR", 400, {
            issues: r.error.issues,
          });
        }

        const { task_id, result_summary } = r.data;

        const task = await completeWithResult(task_id, {
          agentId: agent_id,
          agentName: agent_id,
        }, result_summary);

        return apiJson({ task, message: "Task completed" });
      }

      /* ---------------------------------------------------------- */
      /* update_progress — update task completion %                   */
      /* Uses task-coordinator's reportProgress                      */
      /* ---------------------------------------------------------- */
      case "update_progress": {
        const p = updateProgressPayload.safeParse(payload);
        if (!p.success) {
          return apiError("Invalid update_progress payload", "VALIDATION_ERROR", 400, {
            issues: p.error.issues,
          });
        }

        const { task_id, progress_percent, current_action } = p.data;

        await reportProgress(
          task_id,
          agent_id,
          document_id ?? "",
          progress_percent,
          current_action ?? "processing",
        );

        return apiJson({ message: "Progress updated", progress_percent });
      }

      /* ---------------------------------------------------------- */
      /* create_proposal — submit an edit proposal for review        */
      /* Uses Supabase proposals module + fires webhook event        */
      /* ---------------------------------------------------------- */
      case "create_proposal": {
        const cp = createProposalPayload.safeParse(payload);
        if (!cp.success) {
          return apiError("Invalid create_proposal payload", "VALIDATION_ERROR", 400, {
            issues: cp.error.issues,
          });
        }

        const proposal = await createProposal({
          task_id: cp.data.task_id,
          document_id: cp.data.document_id,
          block_id: cp.data.block_id ?? null,
          edit_type: cp.data.edit_type,
          original_content: cp.data.original_content ?? null,
          proposed_content: cp.data.proposed_content,
          explanation: cp.data.explanation ?? null,
          surrounding_context: cp.data.surrounding_context ?? null,
        });

        // Fire webhook notification
        dispatchWebhookEvent(agent_id, workspace_id, "proposal.created", {
          proposal_id: proposal.id,
          task_id: cp.data.task_id,
          document_id: cp.data.document_id,
          edit_type: cp.data.edit_type,
        }).catch(() => {});

        return apiJson({ proposal }, 201);
      }

      /* ---------------------------------------------------------- */
      /* update_session — update agent's cursor / presence           */
      /* Uses Supabase sessions module                               */
      /* ---------------------------------------------------------- */
      case "update_session": {
        const us = updateSessionPayload.safeParse(payload);
        if (!us.success) {
          return apiError("Invalid update_session payload", "VALIDATION_ERROR", 400, {
            issues: us.error.issues,
          });
        }

        const session = await upsertSession({
          agent_id,
          agent_name: us.data.agent_name,
          agent_avatar: us.data.agent_avatar ?? "🤖",
          agent_color: us.data.agent_color ?? "#8B5CF6",
          workspace_id,
          document_id: us.data.document_id ?? document_id ?? null,
          status: us.data.status ?? "idle",
          current_section: us.data.current_section ?? null,
          current_block_id: us.data.current_block_id ?? null,
        });

        return apiJson({ session });
      }

      default:
        return apiError(`Unknown action: ${action}`, "INVALID_ACTION", 400);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error(`[Agent Webhook] ${action} failed:`, err);
    return apiError(message, "INTERNAL_ERROR", 500);
  }
}
