import type { AgentTask as SupabaseAgentTask } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* Client-side display types                                           */
/* ------------------------------------------------------------------ */

export type TaskStatus = 
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TaskType = 
  | 'inline'
  | 'chat'
  | 'suggestion'
  | 'summarize';

export interface TextSelection {
  from: number;
  to: number;
  text: string;
}

export interface AgentInfo {
  name: string;
  model: string;
  provider: string;
  temperature?: number;
}

export interface AgentTask {
  id: string;
  type: TaskType;
  status: TaskStatus;
  prompt: string;
  documentId: string;
  documentTitle: string;
  selection?: TextSelection;
  result?: string;
  error?: string;
  agent: AgentInfo;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/* ------------------------------------------------------------------ */
/* DisplayTask — unified type used by components                       */
/* Consumes either the old Zustand AgentTask or a Supabase AgentTask   */
/* ------------------------------------------------------------------ */

export interface DisplayTask {
  id: string;
  type: string;
  status: TaskStatus;
  prompt: string;
  documentId: string;
  documentTitle: string;
  result?: string;
  error?: string;
  agentName: string;
  agentModel?: string;
  progressPercent?: number;
  currentAction?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Map a Supabase DB AgentTask row to a DisplayTask.
 */
export function toDisplayTask(t: SupabaseAgentTask): DisplayTask {
  const statusMap: Record<SupabaseAgentTask["status"], TaskStatus> = {
    pending: "queued",
    acknowledged: "queued",
    working: "running",
    completed: "completed",
    failed: "failed",
    cancelled: "cancelled",
  };

  return {
    id: t.id,
    type: t.task_type ?? "inline",
    status: statusMap[t.status] ?? "queued",
    prompt: t.prompt,
    documentId: t.document_id,
    documentTitle: t.title || "Untitled",
    result: t.result_summary ?? undefined,
    error: t.error_message ?? undefined,
    agentName: t.agent_id,
    agentModel: undefined,
    progressPercent: t.progress_percent,
    currentAction: t.current_action ?? undefined,
    createdAt: new Date(t.created_at),
    updatedAt: new Date(t.completed_at ?? t.started_at ?? t.created_at),
  };
}

/**
 * Map a legacy Zustand AgentTask to a DisplayTask.
 */
export function legacyToDisplayTask(t: AgentTask): DisplayTask {
  return {
    id: t.id,
    type: t.type,
    status: t.status,
    prompt: t.prompt,
    documentId: t.documentId,
    documentTitle: t.documentTitle,
    result: t.result,
    error: t.error,
    agentName: t.agent.name,
    agentModel: t.agent.model,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}
