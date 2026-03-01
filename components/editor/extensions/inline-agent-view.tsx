"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useMemo, useCallback, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  CheckCircle2,
  Check,
  Trash2,
  PencilLine,
  Square,
  Pencil,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useDocumentTasks } from "@/hooks/use-agent-tasks";
import Image from "next/image";
import { useDocumentProposals } from "@/hooks/use-agent-proposals";
import { toDisplayTask } from "@/lib/agents/task-types";
import { createInlineAgentTask, cancelAgentStream } from "./inline-agent";
import { listAgents } from "@/lib/agents/store";
import type { Mention } from "@/lib/mentions/types";
import { getInitial } from "@/lib/mentions/store";

/* ------------------------------------------------------------------ */
/* Inline Prompt Input                                                  */
/* ------------------------------------------------------------------ */

function InlinePromptInput({
  agentName,
  agentAvatar,
  agentColor,
  initialValue,
  onSubmit,
  onCancel,
}: {
  agentName: string;
  agentAvatar: string;
  agentColor: string;
  initialValue?: string;
  onSubmit: (prompt: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSubmit(value.trim());
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative my-2 w-full"
      contentEditable={false}
    >
      <div
        className="rounded-lg border"
        style={{ borderColor: `${agentColor}30`, backgroundColor: `${agentColor}08` }}
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5 border-b"
          style={{ borderColor: `${agentColor}20` }}
        >
          <div
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]"
            style={{ backgroundColor: agentColor, color: "#fff" }}
          >
            {agentAvatar}
          </div>
          <span className="text-xs font-medium" style={{ color: agentColor }}>
            @{agentName}
          </span>
          <span className="text-[10px]" style={{ color: `${agentColor}80` }}>
            — type your instruction below
          </span>
        </div>

        <div className="flex items-end gap-2 px-3 py-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What would you like this agent to do?"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none leading-relaxed"
            style={{ minHeight: "1.5rem", maxHeight: "12rem" }}
          />
          <div className="flex items-center gap-1 shrink-0 pb-0.5">
            <button
              onClick={onCancel}
              className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Delete (Esc)"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { if (value.trim()) onSubmit(value.trim()); }}
              disabled={!value.trim()}
              className="rounded-md p-1.5 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: agentColor }}
              title="Submit (Enter)"
            >
              <PencilLine className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="px-3 pb-1.5">
          <span className="text-[10px] text-neutral-400">
            <kbd className="rounded bg-white/60 px-1 py-0.5 font-mono text-[9px] border border-neutral-200/60">Enter</kbd> submit
            {" "}<kbd className="rounded bg-white/60 px-1 py-0.5 font-mono text-[9px] border border-neutral-200/60">Shift+Enter</kbd> new line
            {" "}<kbd className="rounded bg-white/60 px-1 py-0.5 font-mono text-[9px] border border-neutral-200/60">Esc</kbd> cancel
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Main Node View                                                       */
/* ------------------------------------------------------------------ */

export function InlineAgentNodeView({ node, deleteNode, editor, updateAttributes }: NodeViewProps) {
  const taskId = node.attrs.taskId as string | null;
  const mention = node.attrs.mention as Mention | null;
  const promptMode = node.attrs.promptMode as boolean;
  const documentId = node.attrs.documentId as string | null;

  // All hooks must be called unconditionally — React requires the same hooks
  // in the same order on every render regardless of which branch we render.
  const { tasks: supabaseTasks, cancel: cancelSupabaseTask } = useDocumentTasks(documentId);
  const { pending: pendingProposals, accept: acceptProposal, reject: rejectProposal } = useDocumentProposals(documentId);

  const task = useMemo(() => {
    if (!taskId) return null;
    const found = supabaseTasks.find((t) => t.id === taskId);
    return found ? toDisplayTask(found) : null;
  }, [supabaseTasks, taskId]);

  const taskProposals = useMemo(
    () => pendingProposals.filter((p) => p.task_id === taskId),
    [pendingProposals, taskId],
  );

  const handleCancelTask = useCallback((id: string) => {
    cancelAgentStream(id);
    cancelSupabaseTask(id);
    deleteNode();
  }, [cancelSupabaseTask, deleteNode]);

  const handleEdit = useCallback(() => {
    if (taskId) {
      cancelAgentStream(taskId);
      cancelSupabaseTask(taskId);
    }
    updateAttributes({ promptMode: true, taskId: null });
  }, [taskId, cancelSupabaseTask, updateAttributes]);

  const handleAcceptResult = useCallback(() => {
    if (!task?.result || !editor) return;
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
    await acceptProposal(proposalId, "current-user");
    handleAcceptResult();
  }, [acceptProposal, handleAcceptResult]);

  const handleRejectProposal = useCallback(async (proposalId: string) => {
    await rejectProposal(proposalId, "current-user");
    deleteNode();
  }, [rejectProposal, deleteNode]);

  const handlePromptSubmit = useCallback((prompt: string) => {
    const agentId = node.attrs.agentId as string;
    const agentName = (node.attrs.agentName as string) || "Agent";
    const agentAvatar = (node.attrs.agentAvatar as string) || "🤖";
    const agentColor = (node.attrs.agentColor as string) || "#8B5CF6";
    const docId = (node.attrs.documentId as string) || "";
    const docTitle = (node.attrs.documentTitle as string) || "";
    const wsId = (node.attrs.workspaceId as string) || "";
    const uid = (node.attrs.userId as string) || "";

    const agents = listAgents();
    const agent = agents.find((a) => a.id === agentId) ?? {
      id: agentId,
      name: agentName,
      avatar: agentAvatar,
      color: agentColor,
      status: "online" as const,
      personality: "helpful" as const,
      capabilities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    updateAttributes({ promptMode: false, submittedPrompt: prompt });

    createInlineAgentTask(editor, agent, prompt, docId, docTitle, wsId, uid)
      .then((resultTaskId) => {
        if (resultTaskId) updateAttributes({ taskId: resultTaskId });
      })
      .catch(() => {
        deleteNode();
      });
  }, [node.attrs, editor, updateAttributes, deleteNode]);

  const handlePromptCancel = useCallback(() => {
    deleteNode();
  }, [deleteNode]);

  // ── Human mention: simple inline chip ────────────────────────────
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

  // ── Prompt mode: inline input ────────────────────────────────────
  if (promptMode && !taskId) {
    return (
      <NodeViewWrapper className="inline-agent-node" data-drag-handle="">
        <InlinePromptInput
          agentName={(node.attrs.agentName as string) || "Agent"}
          agentAvatar={(node.attrs.agentAvatar as string) || "🤖"}
          agentColor={(node.attrs.agentColor as string) || "#8B5CF6"}
          initialValue={(node.attrs.submittedPrompt as string) || ""}
          onSubmit={handlePromptSubmit}
          onCancel={handlePromptCancel}
        />
      </NodeViewWrapper>
    );
  }

  // ── Queued / Processing — unified block ────────────────────────
  const agentName = (node.attrs.agentName as string) || "Agent";
  const agentColor = (node.attrs.agentColor as string) || "#8B5CF6";
  const agentModel = (node.attrs.agentModel as string) || "";
  const promptText = (node.attrs.submittedPrompt as string) || task?.prompt || "";
  const isOpenClaw = agentModel === "openclaw";

  const isQueued = !task || task.status === "queued";
  const isRunning = task?.status === "running";
  const isCompleted = task?.status === "completed";
  const isFailed = task?.status === "failed";
  const isActive = isQueued || isRunning;

  if (isActive || isFailed) {
    return (
      <NodeViewWrapper className="inline-agent-node">
        <div className="relative my-2 w-full group" contentEditable={false}>
          <div
            className={`rounded-lg border ${
              isFailed
                ? "bg-red-50/40 border-red-200/60"
                : ""
            }`}
            style={!isFailed ? { borderColor: `${agentColor}30`, backgroundColor: `${agentColor}08` } : undefined}
          >
            {/* Header: avatar + name + status */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b" style={{ borderColor: isFailed ? undefined : `${agentColor}20` }}>
              <div
                className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full"
                style={{ backgroundColor: agentColor }}
              >
                {isOpenClaw ? (
                  <Image src="/openclaw.png" alt="OpenClaw" width={20} height={20} className="h-full w-full object-cover rounded-full" />
                ) : (
                  <span className="text-[10px] text-white">{(node.attrs.agentAvatar as string) || "🤖"}</span>
                )}
              </div>
              <span className="text-xs font-medium" style={{ color: isFailed ? undefined : agentColor }}>
                @{agentName}
              </span>

              {isQueued && (
                <div className="flex items-center gap-1 text-[10px]" style={{ color: `${agentColor}80` }}>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: agentColor }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: agentColor }} />
                  </span>
                  <span>Queued</span>
                </div>
              )}
              {isRunning && (
                <div className="flex items-center gap-1 text-[10px]" style={{ color: `${agentColor}80` }}>
                  <Loader2 className="h-3 w-3 animate-spin" style={{ color: agentColor }} />
                  <span>Processing...</span>
                </div>
              )}
              {isFailed && (
                <div className="flex items-center gap-1 text-[10px] text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>Failed</span>
                </div>
              )}
            </div>

            {/* Prompt text + action buttons */}
            <div className="flex items-end gap-2 px-3 py-2">
              <div className="flex-1 min-w-0">
                {promptText && (
                  <>
                    {isQueued ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600 animate-pulse">
                        {promptText}
                      </p>
                    ) : isRunning ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-400 opacity-0 group-hover:opacity-100">
                        {promptText}
                      </p>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
                        {promptText}
                      </p>
                    )}
                  </>
                )}

                {isRunning && task?.currentAction && (
                  <p className="mt-0.5 text-[11px] text-neutral-400 truncate">{task.currentAction}</p>
                )}

                {isFailed && task?.error && (
                  <p className="text-xs text-red-600">{task.error}</p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0 pb-0.5">
                {isActive && (
                  <button
                    onClick={() => handleCancelTask(task?.id ?? taskId ?? "")}
                    className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500"
                    title="Stop"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={handleEdit}
                  className="rounded-md p-1.5 text-white"
                  style={{ backgroundColor: agentColor }}
                  title="Edit"
                >
                  <PencilLine className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Indeterminate progress bar */}
            {isRunning && (
              <div className="mx-3 mb-2 h-1 bg-neutral-200/60 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: agentColor, width: "40%" }}
                  initial={{ x: "-100%" }}
                  animate={{ x: "250%" }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                />
              </div>
            )}
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // Completed with proposals
  if (isCompleted && taskProposals.length > 0) {
    return (
      <NodeViewWrapper className="inline-agent-node">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative my-2 w-full space-y-2"
          contentEditable={false}
        >
          {taskProposals.map((proposal) => {
            const content = (proposal.proposed_content as Record<string, unknown>)?.text as string
              ?? task.result ?? "";
            return (
              <div key={proposal.id} className="rounded-lg border border-emerald-200 bg-emerald-50/50">
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
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleAcceptProposal(proposal.id)}
                      className="flex items-center gap-1 rounded bg-emerald-500 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-emerald-600"
                    >
                      <Check className="h-3 w-3" />
                      Accept
                    </button>
                  </div>
                </div>
                <div className="px-3 py-2">
                  {proposal.explanation && (
                    <p className="mb-1 text-[11px] italic text-neutral-500">{proposal.explanation}</p>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{content}</p>
                </div>
              </div>
            );
          })}
        </motion.div>
      </NodeViewWrapper>
    );
  }

  // Completed with result
  if (isCompleted && task.result) {
    return (
      <NodeViewWrapper className="inline-agent-node">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative my-2 w-full rounded-lg border border-emerald-200 bg-emerald-50/50"
          contentEditable={false}
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
              >
                <X className="h-3 w-3" />
              </button>
              <button
                onClick={handleAcceptResult}
                className="flex items-center gap-1 rounded bg-emerald-500 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-emerald-600"
              >
                <Check className="h-3 w-3" />
                Accept
              </button>
            </div>
          </div>
          <div className="px-3 py-2">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{task.result}</p>
          </div>
        </motion.div>
      </NodeViewWrapper>
    );
  }

  // Fallback: cancelled or unknown status — remove the node
  return (
    <NodeViewWrapper className="inline-agent-node">
      <span className="text-xs text-neutral-400 italic" contentEditable={false}>
        Task ended.
      </span>
    </NodeViewWrapper>
  );
}
