import { createClient } from "./client";
import type {
  AgentTask,
  AgentTaskInsert,
  AgentTaskUpdate,
  AgentTaskStatus,
} from "./types";

/* ------------------------------------------------------------------ */
/* Agent Task CRUD                                                     */
/* ------------------------------------------------------------------ */

const supabase = () => createClient();

/** Create a new agent task */
export async function createTask(input: AgentTaskInsert): Promise<AgentTask> {
  const { data, error } = await supabase()
    .from("agent_tasks")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create task: ${error.message}`);
  return data as AgentTask;
}

/** Get a single task by id */
export async function getTask(taskId: string): Promise<AgentTask | null> {
  const { data, error } = await supabase()
    .from("agent_tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (error) return null;
  return data as AgentTask | null;
}

/** List tasks for a document */
export async function listTasksByDocument(
  documentId: string,
  options?: { status?: AgentTaskStatus[]; limit?: number },
): Promise<AgentTask[]> {
  let query = supabase()
    .from("agent_tasks")
    .select("*")
    .eq("document_id", documentId)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (options?.status?.length) {
    query = query.in("status", options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list tasks: ${error.message}`);
  return (data ?? []) as AgentTask[];
}

/** List tasks for a school */
export async function listTasksBySchool(
  schoolId: string,
  options?: { status?: AgentTaskStatus[]; agentId?: string; limit?: number },
): Promise<AgentTask[]> {
  let query = supabase()
    .from("agent_tasks")
    .select("*")
    .eq("school_id", schoolId)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (options?.status?.length) {
    query = query.in("status", options.status);
  }
  if (options?.agentId) {
    query = query.eq("agent_id", options.agentId);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list school tasks: ${error.message}`);
  return (data ?? []) as AgentTask[];
}

/** List pending tasks for an agent (queue) */
export async function getAgentQueue(
  agentId: string,
  schoolId?: string,
): Promise<AgentTask[]> {
  let query = supabase()
    .from("agent_tasks")
    .select("*")
    .eq("agent_id", agentId)
    .in("status", ["pending", "acknowledged", "working"])
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (schoolId) {
    query = query.eq("school_id", schoolId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get agent queue: ${error.message}`);
  return (data ?? []) as AgentTask[];
}

/** Update a task */
export async function updateTask(
  taskId: string,
  updates: AgentTaskUpdate,
): Promise<AgentTask> {
  const { data, error } = await supabase()
    .from("agent_tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update task: ${error.message}`);
  return data as AgentTask;
}

/** Cancel a task */
export async function cancelTask(taskId: string): Promise<AgentTask> {
  return updateTask(taskId, {
    status: "cancelled",
    completed_at: new Date().toISOString(),
  });
}

/** Retry a failed task — reset to pending so the agent can pick it up again */
export async function retryTask(taskId: string): Promise<AgentTask> {
  return updateTask(taskId, {
    status: "pending",
    error_message: null,
    current_action: null,
    progress_percent: 0,
    started_at: null,
    completed_at: null,
    last_activity_at: new Date().toISOString(),
  });
}

/** Mark task as acknowledged (agent picked it up) */
export async function acknowledgeTask(taskId: string): Promise<AgentTask> {
  return updateTask(taskId, {
    status: "acknowledged",
    acknowledged_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  });
}

/** Mark task as working */
export async function startTask(
  taskId: string,
  currentAction?: string,
): Promise<AgentTask> {
  return updateTask(taskId, {
    status: "working",
    started_at: new Date().toISOString(),
    current_action: currentAction ?? "processing",
    progress_percent: 0,
    last_activity_at: new Date().toISOString(),
  });
}

/** Update task progress */
export async function updateTaskProgress(
  taskId: string,
  percent: number,
  currentAction?: string,
): Promise<AgentTask> {
  return updateTask(taskId, {
    progress_percent: Math.min(100, Math.max(0, percent)),
    ...(currentAction ? { current_action: currentAction } : {}),
    last_activity_at: new Date().toISOString(),
  });
}

/** Complete a task */
export async function completeTask(
  taskId: string,
  resultSummary: string,
  resultBlocks?: string[],
): Promise<AgentTask> {
  return updateTask(taskId, {
    status: "completed",
    completed_at: new Date().toISOString(),
    progress_percent: 100,
    current_action: null,
    result_summary: resultSummary,
    result_blocks: resultBlocks ?? null,
    last_activity_at: new Date().toISOString(),
  });
}

/** Fail a task */
export async function failTask(
  taskId: string,
  errorMessage: string,
): Promise<AgentTask> {
  const task = await getTask(taskId);
  const retryCount = (task?.retry_count ?? 0) + 1;

  if (task && retryCount <= (task.max_retries ?? 3)) {
    return updateTask(taskId, {
      status: "pending",
      error_message: errorMessage,
      retry_count: retryCount,
      current_action: null,
      last_activity_at: new Date().toISOString(),
    });
  }

  return updateTask(taskId, {
    status: "failed",
    completed_at: new Date().toISOString(),
    error_message: errorMessage,
    retry_count: retryCount,
    current_action: null,
    last_activity_at: new Date().toISOString(),
  });
}

/** Subscribe to task changes for a document (realtime) */
export function subscribeToDocumentTasks(
  documentId: string,
  callback: (task: AgentTask, eventType?: string, old?: Partial<AgentTask>) => void,
): { unsubscribe: () => void } {
  const channel = supabase()
    .channel(`document-tasks-${documentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "agent_tasks",
        filter: `document_id=eq.${documentId}`,
      },
      (payload) => {
        callback(payload.new as AgentTask, payload.eventType, payload.old as Partial<AgentTask>);
      },
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase().removeChannel(channel);
    },
  };
}

/** Subscribe to tasks assigned to a specific agent (realtime) */
export function subscribeToAgentTasks(
  agentId: string,
  callback: (task: AgentTask, eventType: "INSERT" | "UPDATE" | "DELETE") => void,
): { unsubscribe: () => void } {
  const channel = supabase()
    .channel(`agent-tasks-${agentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "agent_tasks",
        filter: `agent_id=eq.${agentId}`,
      },
      (payload) => {
        callback(
          payload.new as AgentTask,
          payload.eventType as "INSERT" | "UPDATE" | "DELETE",
        );
      },
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase().removeChannel(channel);
    },
  };
}
