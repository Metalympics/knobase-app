"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  AgentTask,
  AgentEditProposal,
  AgentSession,
} from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  cancelledTasks: number;
  pendingTasks: number;
  averageCompletionMs: number;
  totalProposals: number;
  acceptedProposals: number;
  rejectedProposals: number;
  modifiedProposals: number;
  acceptanceRate: number;
  totalSessions: number;
  totalSessionMinutes: number;
  /** Tasks grouped by day (last 30 days) */
  dailyTasks: DailyCount[];
  /** Proposals grouped by day (last 30 days) */
  dailyProposals: DailyCount[];
  /** Task type breakdown */
  taskTypeBreakdown: Record<string, number>;
  /** Average response time per task type */
  responseTimeByType: Record<string, number>;
}

export interface DailyCount {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface WorkspaceAgentAnalytics {
  workspaceId: string;
  agents: AgentMetrics[];
  totals: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    totalProposals: number;
    acceptedProposals: number;
    rejectedProposals: number;
    acceptanceRate: number;
    averageCompletionMs: number;
  };
  /** Most active documents by task count */
  topDocuments: { documentId: string; taskCount: number }[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const supabase = () => createClient();

function dayKey(iso: string): string {
  return iso.split("T")[0];
}

function msBetween(start: string, end: string): number {
  return new Date(end).getTime() - new Date(start).getTime();
}

function buildDailyHistogram(
  items: { date: string }[],
  days: number = 30,
): DailyCount[] {
  const now = new Date();
  const result: DailyCount[] = [];
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = item.date;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    result.push({ date: key, count: counts.get(key) ?? 0 });
  }

  return result;
}

/* ------------------------------------------------------------------ */
/* Data fetching                                                       */
/* ------------------------------------------------------------------ */

/** Fetch all tasks for a workspace within the last N days */
async function fetchWorkspaceTasks(
  workspaceId: string,
  days: number = 30,
): Promise<AgentTask[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase()
    .from("agent_tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
  return (data ?? []) as AgentTask[];
}

/** Fetch proposals for a set of task IDs (proposals don't have workspace_id) */
async function fetchProposalsByTaskIds(
  taskIds: string[],
  days: number = 30,
): Promise<AgentEditProposal[]> {
  if (taskIds.length === 0) return [];
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase()
    .from("agent_edit_proposals")
    .select("*")
    .in("task_id", taskIds)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch proposals: ${error.message}`);
  return (data ?? []) as AgentEditProposal[];
}

/** Build a map from task_id → agent_id for proposal attribution */
function buildTaskToAgentMap(tasks: AgentTask[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const t of tasks) map.set(t.id, t.agent_id);
  return map;
}

/** Fetch all sessions for a workspace within the last N days */
async function fetchWorkspaceSessions(
  workspaceId: string,
  days: number = 30,
): Promise<AgentSession[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase()
    .from("agent_sessions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gte("started_at", since.toISOString())
    .order("started_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch sessions: ${error.message}`);
  return (data ?? []) as AgentSession[];
}

/* ------------------------------------------------------------------ */
/* Compute metrics for a single agent                                  */
/* ------------------------------------------------------------------ */

function computeAgentMetrics(
  agentId: string,
  agentName: string,
  tasks: AgentTask[],
  proposals: AgentEditProposal[],
  sessions: AgentSession[],
  taskToAgent: Map<string, string>,
): AgentMetrics {
  const agentTasks = tasks.filter((t) => t.agent_id === agentId);
  const agentProposals = proposals.filter((p) => taskToAgent.get(p.task_id) === agentId);
  const agentSessions = sessions.filter((s) => s.agent_id === agentId);

  const completed = agentTasks.filter((t) => t.status === "completed");
  const failed = agentTasks.filter((t) => t.status === "failed");
  const cancelled = agentTasks.filter((t) => t.status === "cancelled");
  const pending = agentTasks.filter(
    (t) => t.status === "pending" || t.status === "acknowledged" || t.status === "working",
  );

  // Average completion time
  const completionTimes = completed
    .filter((t) => t.started_at && t.completed_at)
    .map((t) => msBetween(t.started_at!, t.completed_at!));
  const avgCompletion =
    completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

  // Proposals
  const accepted = agentProposals.filter((p) => p.status === "accepted");
  const rejected = agentProposals.filter((p) => p.status === "rejected");
  const modified = agentProposals.filter((p) => p.status === "modified");
  const decided = accepted.length + rejected.length + modified.length;
  const acceptanceRate =
    decided > 0 ? (accepted.length + modified.length) / decided : 0;

  // Sessions — use last_activity_at as session end proxy
  const totalMinutes = agentSessions
    .filter((s) => s.last_activity_at)
    .reduce(
      (sum, s) => sum + msBetween(s.started_at, s.last_activity_at) / 60_000,
      0,
    );

  // Daily histograms
  const dailyTasks = buildDailyHistogram(
    agentTasks.map((t) => ({ date: dayKey(t.created_at) })),
  );
  const dailyProposals = buildDailyHistogram(
    agentProposals.map((p) => ({ date: dayKey(p.created_at) })),
  );

  // Task type breakdown
  const taskTypeBreakdown: Record<string, number> = {};
  for (const t of agentTasks) {
    const type = t.task_type ?? "unknown";
    taskTypeBreakdown[type] = (taskTypeBreakdown[type] ?? 0) + 1;
  }

  // Response time by type
  const responseTimeByType: Record<string, number> = {};
  const typeGroups = new Map<string, number[]>();
  for (const t of completed) {
    if (t.started_at && t.completed_at) {
      const type = t.task_type ?? "unknown";
      if (!typeGroups.has(type)) typeGroups.set(type, []);
      typeGroups.get(type)!.push(msBetween(t.started_at, t.completed_at));
    }
  }
  for (const [type, times] of typeGroups) {
    responseTimeByType[type] =
      times.reduce((a, b) => a + b, 0) / times.length;
  }

  return {
    agentId,
    agentName,
    totalTasks: agentTasks.length,
    completedTasks: completed.length,
    failedTasks: failed.length,
    cancelledTasks: cancelled.length,
    pendingTasks: pending.length,
    averageCompletionMs: avgCompletion,
    totalProposals: agentProposals.length,
    acceptedProposals: accepted.length,
    rejectedProposals: rejected.length,
    modifiedProposals: modified.length,
    acceptanceRate,
    totalSessions: agentSessions.length,
    totalSessionMinutes: Math.round(totalMinutes),
    dailyTasks,
    dailyProposals,
    taskTypeBreakdown,
    responseTimeByType,
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Get analytics for all agents in a workspace */
export async function getWorkspaceAgentAnalytics(
  workspaceId: string,
  days: number = 30,
): Promise<WorkspaceAgentAnalytics> {
  // Fetch tasks and sessions in parallel
  const [tasks, sessions] = await Promise.all([
    fetchWorkspaceTasks(workspaceId, days),
    fetchWorkspaceSessions(workspaceId, days),
  ]);

  // Proposals must be fetched via task_ids (no workspace_id column)
  const taskIds = tasks.map((t) => t.id);
  const proposals = await fetchProposalsByTaskIds(taskIds, days);
  const taskToAgent = buildTaskToAgentMap(tasks);

  // Discover unique agents from tasks and sessions
  const agentIds = new Set<string>();
  for (const t of tasks) agentIds.add(t.agent_id);
  for (const s of sessions) agentIds.add(s.agent_id);

  const agents = Array.from(agentIds).map((id) => {
    // Try to resolve a name from session data
    const name =
      sessions.find((s) => s.agent_id === id)?.agent_name ?? id;
    return computeAgentMetrics(id, name, tasks, proposals, sessions, taskToAgent);
  });

  // Totals
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const failedTasks = tasks.filter((t) => t.status === "failed").length;
  const totalProposals = proposals.length;
  const acceptedProposals = proposals.filter((p) => p.status === "accepted").length;
  const rejectedProposals = proposals.filter((p) => p.status === "rejected").length;
  const decidedProposals = proposals.filter(
    (p) => p.status === "accepted" || p.status === "rejected" || p.status === "modified",
  ).length;
  const modifiedProposals = proposals.filter((p) => p.status === "modified").length;
  const acceptanceRate =
    decidedProposals > 0
      ? (acceptedProposals + modifiedProposals) / decidedProposals
      : 0;

  const completionTimes = tasks
    .filter((t) => t.status === "completed" && t.started_at && t.completed_at)
    .map((t) => msBetween(t.started_at!, t.completed_at!));
  const averageCompletionMs =
    completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : 0;

  // Top documents by task count
  const docCounts = new Map<string, number>();
  for (const t of tasks) {
    if (t.document_id) {
      docCounts.set(t.document_id, (docCounts.get(t.document_id) ?? 0) + 1);
    }
  }
  const topDocuments = Array.from(docCounts.entries())
    .map(([documentId, taskCount]) => ({ documentId, taskCount }))
    .sort((a, b) => b.taskCount - a.taskCount)
    .slice(0, 10);

  return {
    workspaceId,
    agents,
    totals: {
      totalTasks,
      completedTasks,
      failedTasks,
      totalProposals,
      acceptedProposals,
      rejectedProposals,
      acceptanceRate,
      averageCompletionMs,
    },
    topDocuments,
  };
}

/** Get analytics for a specific agent */
export async function getAgentAnalytics(
  agentId: string,
  workspaceId: string,
  days: number = 30,
): Promise<AgentMetrics> {
  const [tasks, sessions] = await Promise.all([
    fetchWorkspaceTasks(workspaceId, days),
    fetchWorkspaceSessions(workspaceId, days),
  ]);

  const taskIds = tasks.map((t) => t.id);
  const proposals = await fetchProposalsByTaskIds(taskIds, days);
  const taskToAgent = buildTaskToAgentMap(tasks);

  return computeAgentMetrics(agentId, agentId, tasks, proposals, sessions, taskToAgent);
}
