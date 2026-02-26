import { createClient } from "./client";
import type {
  AgentEditProposal,
  AgentEditProposalInsert,
  AgentEditProposalUpdate,
  EditProposalStatus,
} from "./types";

/* ------------------------------------------------------------------ */
/* Agent Edit Proposal CRUD                                            */
/* ------------------------------------------------------------------ */

const supabase = () => createClient();

/** Create a new edit proposal */
export async function createProposal(
  input: AgentEditProposalInsert,
): Promise<AgentEditProposal> {
  const { data, error } = await supabase()
    .from("agent_edit_proposals")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create proposal: ${error.message}`);
  return data as AgentEditProposal;
}

/** Get a single proposal */
export async function getProposal(
  proposalId: string,
): Promise<AgentEditProposal | null> {
  const { data, error } = await supabase()
    .from("agent_edit_proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (error) return null;
  return data as AgentEditProposal | null;
}

/** List proposals for a document */
export async function listProposalsByDocument(
  documentId: string,
  options?: { status?: EditProposalStatus[]; taskId?: string },
): Promise<AgentEditProposal[]> {
  let query = supabase()
    .from("agent_edit_proposals")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });

  if (options?.status?.length) {
    query = query.in("status", options.status);
  }
  if (options?.taskId) {
    query = query.eq("task_id", options.taskId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list proposals: ${error.message}`);
  return (data ?? []) as AgentEditProposal[];
}

/** List pending proposals for a document */
export async function getPendingProposals(
  documentId: string,
): Promise<AgentEditProposal[]> {
  return listProposalsByDocument(documentId, { status: ["pending"] });
}

/** List proposals for a task */
export async function listProposalsByTask(
  taskId: string,
): Promise<AgentEditProposal[]> {
  const { data, error } = await supabase()
    .from("agent_edit_proposals")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to list task proposals: ${error.message}`);
  return (data ?? []) as AgentEditProposal[];
}

/** Accept a proposal */
export async function acceptProposal(
  proposalId: string,
  decidedBy: string,
): Promise<AgentEditProposal> {
  const { data, error } = await supabase()
    .from("agent_edit_proposals")
    .update({
      status: "accepted",
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
    })
    .eq("id", proposalId)
    .select()
    .single();

  if (error) throw new Error(`Failed to accept proposal: ${error.message}`);
  return data as AgentEditProposal;
}

/** Reject a proposal */
export async function rejectProposal(
  proposalId: string,
  decidedBy: string,
): Promise<AgentEditProposal> {
  const { data, error } = await supabase()
    .from("agent_edit_proposals")
    .update({
      status: "rejected",
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
    })
    .eq("id", proposalId)
    .select()
    .single();

  if (error) throw new Error(`Failed to reject proposal: ${error.message}`);
  return data as AgentEditProposal;
}

/** Accept with modifications */
export async function acceptWithModifications(
  proposalId: string,
  decidedBy: string,
  modifiedContent: Record<string, unknown>,
): Promise<AgentEditProposal> {
  const { data, error } = await supabase()
    .from("agent_edit_proposals")
    .update({
      status: "modified",
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
      modified_content: modifiedContent,
    })
    .eq("id", proposalId)
    .select()
    .single();

  if (error) throw new Error(`Failed to modify proposal: ${error.message}`);
  return data as AgentEditProposal;
}

/** Supersede all pending proposals for a document (when agent creates new ones) */
export async function supersedePendingProposals(
  documentId: string,
  exceptTaskId?: string,
): Promise<void> {
  let query = supabase()
    .from("agent_edit_proposals")
    .update({
      status: "superseded" as EditProposalStatus,
    })
    .eq("document_id", documentId)
    .eq("status", "pending");

  if (exceptTaskId) {
    query = query.neq("task_id", exceptTaskId);
  }

  await query;
}

/** Accept all pending proposals for a task */
export async function acceptAllForTask(
  taskId: string,
  decidedBy: string,
): Promise<AgentEditProposal[]> {
  const { data, error } = await supabase()
    .from("agent_edit_proposals")
    .update({
      status: "accepted",
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
    })
    .eq("task_id", taskId)
    .eq("status", "pending")
    .select();

  if (error) throw new Error(`Failed to accept all: ${error.message}`);
  return (data ?? []) as AgentEditProposal[];
}

/** Reject all pending proposals for a task */
export async function rejectAllForTask(
  taskId: string,
  decidedBy: string,
): Promise<void> {
  await supabase()
    .from("agent_edit_proposals")
    .update({
      status: "rejected",
      decided_by: decidedBy,
      decided_at: new Date().toISOString(),
    })
    .eq("task_id", taskId)
    .eq("status", "pending");
}

/** Subscribe to new proposals for a document (realtime) */
export function subscribeToDocumentProposals(
  documentId: string,
  callback: (proposal: AgentEditProposal, eventType: string) => void,
): { unsubscribe: () => void } {
  const channel = supabase()
    .channel(`doc-proposals-${documentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "agent_edit_proposals",
        filter: `document_id=eq.${documentId}`,
      },
      (payload) => {
        callback(payload.new as AgentEditProposal, payload.eventType);
      },
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase().removeChannel(channel);
    },
  };
}
