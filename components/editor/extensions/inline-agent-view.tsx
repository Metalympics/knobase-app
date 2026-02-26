"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  X,
  CheckCircle2,
  Check,
} from "lucide-react";
import { PendingBlock } from "@/components/editor/pending-block";
import { useDocumentTasks } from "@/hooks/use-agent-tasks";
import { useDocumentProposals } from "@/hooks/use-agent-proposals";
import { toDisplayTask } from "@/lib/agents/task-types";
import { cancelAgentStream } from "./inline-agent";
import type { Mention } from "@/lib/mentions/types";
import { getInitial } from "@/lib/mentions/store";

export function InlineAgentNodeView({ node, deleteNode, editor }: NodeViewProps) {
  const taskId = node.attrs.taskId as string | null;
  const mention = node.attrs.mention as Mention | null;
  const documentId = node.attrs.documentId as string | null;
  const { tasks: supabaseTasks, cancel: cancelSupabaseTask } = useDocumentTasks(documentId);
  const { pending: pendingProposals, accept: acceptProposal, reject: rejectProposal } = useDocumentProposals(documentId);

  // If it's a human mention, render the mention inline
  if (mention && mention.type === 'human') {
    return (
      <NodeViewWrapper className="inline mention-node">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
          contentEditable={false}
        >
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: mention.color || '#9333ea' }}
          >
            {getInitial(mention.name)}
          </span>
          <span className="text-sm font-medium">@{mention.name}</span>
        </span>
      </NodeViewWrapper>
    );
  }

  // Otherwise, it's an AI task - show pending/streaming block
  const task = useMemo(() => {
    if (!taskId) return null;
    const found = supabaseTasks.find((t) => t.id === taskId);
    return found ? toDisplayTask(found) : null;
  }, [supabaseTasks, taskId]);

  // Find proposals associated with this task
  const taskProposals = useMemo(
    () => pendingProposals.filter((p) => p.task_id === taskId),
    [pendingProposals, taskId],
  );

  const handleCancel = useCallback((id: string) => {
    cancelAgentStream(id);
    cancelSupabaseTask(id);
    deleteNode();
  }, [cancelSupabaseTask, deleteNode]);

  const handleAcceptResult = useCallback(() => {
    if (!task?.result || !editor) return;
    // Replace this node with the result text
    try {
      let nodePos: number | null = null;
      editor.state.doc.descendants((n, p) => {
        if (n.type.name === "inlineAgent" && n.attrs.taskId === taskId && nodePos === null) {
          nodePos = p;
        }
      });
      if (nodePos !== null) {
        const n = editor.state.doc.nodeAt(nodePos);
        if (n) {
          const tr = editor.state.tr;
          tr.delete(nodePos, nodePos + n.nodeSize);
          tr.insertText(task.result, nodePos);
          editor.view.dispatch(tr);
        }
      }
    } catch {
      deleteNode();
    }
  }, [task, editor, taskId, deleteNode]);

  const handleAcceptProposal = useCallback(async (proposalId: string) => {
    // Accept via Supabase, then apply
    await acceptProposal(proposalId, "current-user");
    handleAcceptResult();
  }, [acceptProposal, handleAcceptResult]);

  const handleRejectProposal = useCallback(async (proposalId: string) => {
    await rejectProposal(proposalId, "current-user");
    deleteNode();
  }, [rejectProposal, deleteNode]);

  if (!task) {
    return (
      <NodeViewWrapper className="inline-agent-node">
        <span className="text-neutral-400 text-sm italic">
          Waiting for agent...
        </span>
      </NodeViewWrapper>
    );
  }

  const isCompleted = task.status === "completed";
  const isFailed = task.status === "failed";

  // If the task is completed and has proposals, show proposal review UI
  if (isCompleted && taskProposals.length > 0) {
    return (
      <NodeViewWrapper className="inline-agent-node">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative my-2 w-full space-y-2"
        >
          {taskProposals.map((proposal) => {
            const content = (proposal.proposed_content as Record<string, unknown>)?.text as string
              ?? task.result ?? "";
            return (
              <div
                key={proposal.id}
                className="rounded-lg border border-emerald-200 bg-emerald-50/50"
              >
                <div className="flex items-center justify-between border-b border-emerald-100 px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-700">
                      {task.agentName} — {proposal.edit_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRejectProposal(proposal.id)}
                      className="rounded px-2 py-0.5 text-[11px] text-neutral-500 hover:bg-red-50 hover:text-red-600"
                      contentEditable={false}
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleAcceptProposal(proposal.id)}
                      className="flex items-center gap-1 rounded bg-emerald-500 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-emerald-600"
                      contentEditable={false}
                    >
                      <Check className="h-3 w-3" />
                      Accept
                    </button>
                  </div>
                </div>
                <div className="px-3 py-2">
                  {proposal.explanation && (
                    <p className="mb-1 text-[11px] italic text-neutral-500">
                      {proposal.explanation}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                    {content}
                  </p>
                </div>
              </div>
            );
          })}
        </motion.div>
      </NodeViewWrapper>
    );
  }

  // Completed with result but no proposals — show simple accept
  if (isCompleted && task.result) {
    return (
      <NodeViewWrapper className="inline-agent-node">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative my-2 w-full rounded-lg border border-emerald-200 bg-emerald-50/50"
        >
          <div className="flex items-center justify-between border-b border-emerald-100 px-3 py-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-medium text-emerald-700">
                {task.agentName} responded
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => deleteNode()}
                className="rounded px-2 py-0.5 text-[11px] text-neutral-500 hover:bg-red-50 hover:text-red-600"
                contentEditable={false}
              >
                <X className="h-3 w-3" />
              </button>
              <button
                onClick={handleAcceptResult}
                className="flex items-center gap-1 rounded bg-emerald-500 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-emerald-600"
                contentEditable={false}
              >
                <Check className="h-3 w-3" />
                Accept
              </button>
            </div>
          </div>
          <div className="px-3 py-2">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
              {task.result}
            </p>
          </div>
        </motion.div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="inline-agent-node">
      <PendingBlock task={task} onCancel={handleCancel} />
    </NodeViewWrapper>
  );
}
