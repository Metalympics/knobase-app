import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyTaskCreated } from "@/lib/webhooks/outbound";

/**
 * POST /api/v1/agents/tasks/:id/nudge
 *
 * Re-dispatches the task.created webhook for a task that appears inactive.
 * If the agent crashed/restarted, this reminds it about the task.
 * If the agent is still working, it can safely ignore the duplicate.
 *
 * Also used for retrying failed tasks: resets the task to pending and
 * re-dispatches the webhook.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: task, error } = await supabase
    .from("agent_tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !task) {
    return NextResponse.json(
      { error: "Task not found" },
      { status: 404 },
    );
  }

  // For failed tasks, reset to pending so the agent can pick it up again
  if (task.status === "failed") {
    await supabase
      .from("agent_tasks")
      .update({
        status: "pending",
        error_message: null,
        current_action: null,
        progress_percent: 0,
        started_at: null,
        completed_at: null,
        last_activity_at: new Date().toISOString(),
      })
      .eq("id", id);
  } else {
    // For active/pending tasks, just bump last_activity_at
    await supabase
      .from("agent_tasks")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("id", id);
  }

  // Re-dispatch the task.created webhook
  await notifyTaskCreated(task as unknown as Record<string, unknown>).catch(
    () => {},
  );

  return NextResponse.json({
    message: task.status === "failed" ? "Task retried" : "Nudge sent",
    task_id: id,
  });
}
