import {
  createTask,
  getTask,
  acknowledgeTask,
  startTask,
  updateTaskProgress,
  completeTask,
  failTask,
  cancelTask,
  getAgentQueue,
} from "@/lib/supabase/tasks";
import {
  createMention,
  acknowledgeMention,
  completeMention,
  linkMentionToTask,
} from "@/lib/supabase/mentions";
import {
  upsertSession,
  updateAgentSessionByKey,
  endSession,
} from "@/lib/supabase/sessions";
import {
  createProposal,
  acceptProposal,
  rejectProposal,
  acceptWithModifications,
  acceptAllForTask,
  rejectAllForTask,
} from "@/lib/supabase/proposals";
import type {
  AgentTask,
  AgentTaskInsert,
  Mention,
  AgentEditProposal,
  AgentEditProposalInsert,
} from "@/lib/supabase/types";
import { processLearningEvent } from "@/lib/agents/persona-learning";
import { dispatchWebhookEvent, notifyTaskCreated } from "@/lib/webhooks/outbound";

/* ------------------------------------------------------------------ */
/* Task Coordinator                                                    */
/* ------------------------------------------------------------------ */

/**
 * High-level coordinator for the agent task lifecycle.
 *
 * Orchestrates: @mention → task creation → session update → work →
 *               edit proposal → user accept/reject → completion
 */

/* ------------------------------------------------------------------ */
/* 1. Mention handling                                                 */
/* ------------------------------------------------------------------ */

export interface MentionContext {
  documentId: string;
  workspaceId: string;
  blockId?: string;
  yjsPosition?: number;
  contextBefore?: string;
  contextAfter?: string;
  prompt: string;
  createdBy: string;
  agentId?: string;
  agentName?: string;
}

/**
 * Handle a new @mention in a document. Creates the mention record and
 * automatically creates a task for the targeted agent.
 */
export async function handleMention(ctx: MentionContext): Promise<{
  mention: Mention | null;
  task: AgentTask;
}> {
  const agentId = ctx.agentId ?? "claw";
  const agentName = ctx.agentName ?? "Claw";

  // 1. Create mention record (non-fatal — task creation can proceed without it)
  let mention: Mention | null = null;
  try {
    mention = await createMention({
      document_id: ctx.documentId,
      block_id: ctx.blockId ?? null,
      yjs_position: ctx.yjsPosition ?? null,
      target_type: "agent",
      target_id: agentId,
      target_name: agentName,
      mention_text: `@${agentName}`,
      context_before: ctx.contextBefore ?? null,
      context_after: ctx.contextAfter ?? null,
      prompt: ctx.prompt,
      created_by: ctx.createdBy,
    });
  } catch (err) {
    console.warn("[TaskCoordinator] Mention creation failed (Supabase may be unavailable):", err);
  }

  // 2. Create task from mention
  const task = await createTask({
    task_type: "mention",
    agent_id: agentId,
    document_id: ctx.documentId,
    workspace_id: ctx.workspaceId,
    title: truncate(ctx.prompt, 100),
    prompt: ctx.prompt,
    target_context: {
      type: "mention",
      mention_id: mention?.id,
      block_id: ctx.blockId,
      yjs_position: ctx.yjsPosition,
      context_before: ctx.contextBefore,
      context_after: ctx.contextAfter,
    },
    created_by: ctx.createdBy,
    created_by_type: "user",
    source_mention_id: mention?.id ?? null,
  });

  // 3. Link mention to task (only if mention was created)
  if (mention) {
    await linkMentionToTask(mention.id, task.id).catch(() => {});
  }

  // 4. Fire webhook notification so external agents (OpenClaw) can pick up the task
  notifyTaskCreated(task as unknown as Record<string, unknown>).catch(() => {});

  return { mention, task };
}

/* ------------------------------------------------------------------ */
/* 2. Task lifecycle                                                   */
/* ------------------------------------------------------------------ */

export interface AgentInfo {
  agentId: string;
  agentName: string;
  agentAvatar?: string;
  agentColor?: string;
}

/**
 * Agent acknowledges and begins working on a task.
 * Updates the task status and creates/updates the agent session.
 */
export async function beginWork(
  taskId: string,
  agent: AgentInfo,
  initialAction?: string,
): Promise<AgentTask> {
  // Acknowledge first
  await acknowledgeTask(taskId);

  // Start the task
  const task = await startTask(taskId, initialAction ?? "processing");

  // Upsert agent session
  await upsertSession({
    agent_id: agent.agentId,
    agent_name: agent.agentName,
    agent_avatar: agent.agentAvatar ?? "🤖",
    agent_color: agent.agentColor ?? "#8B5CF6",
    document_id: task.document_id,
    workspace_id: task.workspace_id,
    current_task_id: task.id,
    status: "editing",
    current_block_id: (task.target_context as Record<string, unknown>)?.block_id as string | undefined,
  });

  // Mark linked mention as acknowledged
  if (task.source_mention_id) {
    await acknowledgeMention(task.source_mention_id).catch(() => {});
  }

  return task;
}

/**
 * Report progress on a task (called periodically during work).
 */
export async function reportProgress(
  taskId: string,
  agentId: string,
  documentId: string,
  percent: number,
  currentAction: string,
  currentSection?: string,
): Promise<void> {
  await updateTaskProgress(taskId, percent, currentAction);

  // Update session to reflect current work
  await updateAgentSessionByKey(agentId, documentId, {
    status: percent < 100 ? "editing" : "idle",
    current_section: currentSection ?? null,
  }).catch(() => {});
}

/**
 * Submit edit proposals and complete the task.
 */
export async function submitProposalsAndComplete(
  taskId: string,
  agent: AgentInfo,
  proposals: Omit<AgentEditProposalInsert, "task_id">[],
  resultSummary: string,
): Promise<{ task: AgentTask; proposals: AgentEditProposal[] }> {
  // Create all proposals
  const createdProposals: AgentEditProposal[] = [];
  for (const proposal of proposals) {
    const p = await createProposal({ ...proposal, task_id: taskId });
    createdProposals.push(p);
  }

  // Complete the task
  const task = await completeTask(
    taskId,
    resultSummary,
    createdProposals.map((p) => p.id),
  );

  // Complete the linked mention
  if (task.source_mention_id) {
    await completeMention(task.source_mention_id, agent.agentId, task.id).catch(() => {});
  }

  // Update session to idle
  await updateAgentSessionByKey(agent.agentId, task.document_id, {
    status: "idle",
    current_task_id: null,
  }).catch(() => {});

  // Fire webhook: task.completed + proposal.created
  dispatchWebhookEvent(agent.agentId, task.workspace_id, "task.completed", {
    task_id: task.id,
    result_summary: resultSummary,
    proposal_count: createdProposals.length,
  }).catch(() => {});

  return { task, proposals: createdProposals };
}

/**
 * Complete a task with a simple text result (no proposals).
 */
export async function completeWithResult(
  taskId: string,
  agent: AgentInfo,
  resultSummary: string,
): Promise<AgentTask> {
  const task = await completeTask(taskId, resultSummary);

  if (task.source_mention_id) {
    await completeMention(task.source_mention_id, agent.agentId, task.id).catch(() => {});
  }

  await updateAgentSessionByKey(agent.agentId, task.document_id, {
    status: "idle",
    current_task_id: null,
  }).catch(() => {});

  // Fire learning event for task completion
  processLearningEvent({
    type: "task_completed",
    agentId: agent.agentId,
    workspaceId: task.workspace_id,
    taskType: task.task_type ?? undefined,
    completionTimeMs:
      task.started_at && task.completed_at
        ? new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()
        : undefined,
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  // Fire webhook: task.completed
  dispatchWebhookEvent(agent.agentId, task.workspace_id, "task.completed", {
    task_id: task.id,
    result_summary: resultSummary,
  }).catch(() => {});

  return task;
}

/**
 * Handle task failure.
 */
export async function handleFailure(
  taskId: string,
  agentId: string,
  documentId: string,
  errorMessage: string,
): Promise<AgentTask> {
  const task = await failTask(taskId, errorMessage);

  await updateAgentSessionByKey(agentId, documentId, {
    status: "waiting",
    current_task_id: task.status === "pending" ? task.id : null, // If retrying
  }).catch(() => {});

  // Fire webhook: task.failed
  dispatchWebhookEvent(agentId, task.workspace_id, "task.failed", {
    task_id: task.id,
    error_message: errorMessage,
  }).catch(() => {});

  return task;
}

/**
 * Cancel a task and clean up.
 */
export async function handleCancellation(
  taskId: string,
  agentId: string,
  documentId: string,
  workspaceId?: string,
): Promise<void> {
  await cancelTask(taskId);

  // Check if agent has more tasks
  const queue = await getAgentQueue(agentId).catch(() => []);
  if (queue.length === 0) {
    await endSession(agentId, documentId).catch(() => {});
  }

  // Fire webhook: task.cancelled
  if (workspaceId) {
    dispatchWebhookEvent(agentId, workspaceId, "task.cancelled", {
      task_id: taskId,
    }).catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/* 3. Proposal decisions                                               */
/* ------------------------------------------------------------------ */

/**
 * Accept a single proposal. Returns the proposal with updated status.
 */
export async function acceptEdit(
  proposalId: string,
  userId: string,
): Promise<AgentEditProposal> {
  const proposal = await acceptProposal(proposalId, userId);

  // Resolve agent_id and workspace_id from the associated task
  const task = await getTask(proposal.task_id);

  // Fire learning event
  processLearningEvent({
    type: "proposal_accepted",
    agentId: task?.agent_id ?? "unknown",
    workspaceId: task?.workspace_id ?? "unknown",
    proposedContent:
      typeof (proposal.proposed_content as Record<string, unknown>)?.text === "string"
        ? ((proposal.proposed_content as Record<string, unknown>).text as string)
        : undefined,
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  // Fire webhook: proposal.decided
  if (task) {
    dispatchWebhookEvent(task.agent_id, task.workspace_id, "proposal.decided", {
      proposal_id: proposalId,
      task_id: proposal.task_id,
      decision: "accepted",
      decided_by: userId,
    }).catch(() => {});
  }

  return proposal;
}

/**
 * Reject a single proposal.
 */
export async function rejectEdit(
  proposalId: string,
  userId: string,
): Promise<AgentEditProposal> {
  const proposal = await rejectProposal(proposalId, userId);

  // Resolve agent_id and workspace_id from the associated task
  const task = await getTask(proposal.task_id);

  // Fire learning event
  processLearningEvent({
    type: "proposal_rejected",
    agentId: task?.agent_id ?? "unknown",
    workspaceId: task?.workspace_id ?? "unknown",
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  // Fire webhook: proposal.decided
  if (task) {
    dispatchWebhookEvent(task.agent_id, task.workspace_id, "proposal.decided", {
      proposal_id: proposalId,
      task_id: proposal.task_id,
      decision: "rejected",
      decided_by: userId,
    }).catch(() => {});
  }

  return proposal;
}

/**
 * Accept a proposal with modifications.
 */
export async function acceptEditWithChanges(
  proposalId: string,
  userId: string,
  modifiedContent: Record<string, unknown>,
): Promise<AgentEditProposal> {
  const proposal = await acceptWithModifications(proposalId, userId, modifiedContent);

  // Resolve agent_id and workspace_id from the associated task
  const task = await getTask(proposal.task_id);

  // Fire learning event with both original and modified content
  processLearningEvent({
    type: "proposal_modified",
    agentId: task?.agent_id ?? "unknown",
    workspaceId: task?.workspace_id ?? "unknown",
    proposedContent:
      typeof (proposal.proposed_content as Record<string, unknown>)?.text === "string"
        ? ((proposal.proposed_content as Record<string, unknown>).text as string)
        : undefined,
    modifiedContent:
      typeof modifiedContent?.text === "string" ? (modifiedContent.text as string) : undefined,
    timestamp: new Date().toISOString(),
  }).catch(() => {});

  return proposal;
}

/**
 * Accept all proposals for a task.
 */
export async function acceptAllEdits(
  taskId: string,
  userId: string,
): Promise<AgentEditProposal[]> {
  return acceptAllForTask(taskId, userId);
}

/**
 * Reject all proposals for a task.
 */
export async function rejectAllEdits(
  taskId: string,
  userId: string,
): Promise<void> {
  return rejectAllForTask(taskId, userId);
}

/* ------------------------------------------------------------------ */
/* 4. Queue management                                                 */
/* ------------------------------------------------------------------ */

/**
 * Process the next task in an agent's queue.
 * Returns null if the queue is empty.
 */
export async function dequeueNextTask(
  agentId: string,
): Promise<AgentTask | null> {
  const queue = await getAgentQueue(agentId);

  // Find the highest priority pending task
  const next = queue.find((t) => t.status === "pending");
  if (!next) return null;

  return next;
}

/**
 * Get the queue position for a task.
 */
export async function getQueuePosition(
  taskId: string,
  agentId: string,
): Promise<number> {
  const queue = await getAgentQueue(agentId);
  const idx = queue.findIndex((t) => t.id === taskId);
  return idx === -1 ? -1 : idx + 1;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}
