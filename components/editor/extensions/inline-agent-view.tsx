"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { DOMParser as ProseDOMParser } from "@tiptap/pm/model";
import { useMemo, useCallback, useEffect } from "react";

/* ------------------------------------------------------------------ */
/* Markdown → HTML converter for agent response rendering/insertion     */
/* ------------------------------------------------------------------ */
function markdownToHtml(md: string): string {
  const applyInline = (text: string) =>
    text
      .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
      .replace(/`([^`\n]+)`/g, "<code>$1</code>");

  const lines = md.split("\n");
  const out: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let tableOpen = false;
  let tableBodyOpen = false;
  let consecutiveBlanks = 0;

  const flushList = () => {
    if (listType) { out.push(`</${listType}>`); listType = null; }
  };
  const flushTable = () => {
    if (tableBodyOpen) { out.push("</tbody>"); tableBodyOpen = false; }
    if (tableOpen) { out.push("</table>"); tableOpen = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // Blank line — the first one is just a paragraph separator (already
    // handled by <p> spacing); extra consecutive blanks emit <br>.
    if (line.trim() === "") {
      flushList();
      flushTable();
      if (consecutiveBlanks > 0) {
        out.push("<br>");
      }
      consecutiveBlanks++;
      continue;
    }

    consecutiveBlanks = 0;

    // Headings
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    if (h3 || h2 || h1) {
      flushList(); flushTable();
      const match = (h3 || h2 || h1)!;
      const level = h3 ? 3 : h2 ? 2 : 1;
      out.push(`<h${level}>${applyInline(match[1])}</h${level}>`);
      continue;
    }

    // Table rows
    if (line.startsWith("|")) {
      flushList();
      // Separator row — opens tbody
      if (/^\|[\s|:-]+\|$/.test(line)) {
        if (!tableBodyOpen) { out.push("<tbody>"); tableBodyOpen = true; }
        continue;
      }
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      if (!tableOpen) {
        out.push('<table>');
        out.push("<thead><tr>" + cells.map((c) => `<th>${applyInline(c)}</th>`).join("") + "</tr></thead>");
        tableOpen = true;
      } else {
        out.push("<tr>" + cells.map((c) => `<td>${applyInline(c)}</td>`).join("") + "</tr>");
      }
      continue;
    } else {
      flushTable();
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushList();
      out.push("<hr>");
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^[*-] (.+)/);
    if (ulMatch) {
      if (listType === "ol") flushList();
      if (!listType) { out.push("<ul>"); listType = "ul"; }
      out.push(`<li>${applyInline(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\. (.+)/);
    if (olMatch) {
      if (listType === "ul") flushList();
      if (!listType) { out.push("<ol>"); listType = "ol"; }
      out.push(`<li>${applyInline(olMatch[1])}</li>`);
      continue;
    }

    // Plain paragraph line
    flushList();
    out.push(`<p>${applyInline(line)}</p>`);
  }

  flushList();
  flushTable();
  return out.join("\n");
}
import { useDocumentTasks } from "@/hooks/use-agent-tasks";
import { useDocumentProposals } from "@/hooks/use-agent-proposals";
import { toDisplayTask } from "@/lib/agents/task-types";
import { createInlineAgentTask, cancelAgentStream } from "./inline-agent";
import { listAgents } from "@/lib/agents/store";
import type { Mention } from "@/lib/mentions/types";
import { getInitial } from "@/lib/mentions/store";
import { useDemoSafe } from "@/lib/demo/context";
import { InlineAgentPromptCard } from "@/components/ui-showcase/inline-agent-prompt-card";
import { InlineAgentProcessingCard } from "@/components/ui-showcase/inline-agent-processing-card";
import { InlineAgentResponseCard } from "@/components/ui-showcase/inline-agent-response-card";

/* ------------------------------------------------------------------ */
/* Main Node View                                                       */
/* ------------------------------------------------------------------ */

export function InlineAgentNodeView({ node, deleteNode, editor, updateAttributes }: NodeViewProps) {
  const taskId = node.attrs.taskId as string | null;
  const mention = node.attrs.mention as Mention | null;
  const promptMode = node.attrs.promptMode as boolean;
  const documentId = node.attrs.documentId as string | null;

  const demo = useDemoSafe();

  // All hooks must be called unconditionally — React requires the same hooks
  // in the same order on every render regardless of which branch we render.
  const { tasks: supabaseTasks, cancel: cancelSupabaseTask } = useDocumentTasks(documentId);
  const { pending: pendingProposals, accept: acceptProposal, reject: rejectProposal } = useDocumentProposals(documentId);

  // In demo mode, resolve task status from the simulated task list.
  // This gives us queued/processing/completed states without Supabase.
  const demoTask = useMemo(() => {
    if (!demo || !taskId) return null;
    return demo.simulatedTasks.find((t) => t.id === taskId) ?? null;
  }, [demo, taskId]);

  const task = useMemo(() => {
    if (!taskId) return null;
    // Prefer demo simulated task over Supabase
    if (demoTask) {
      return {
        id: demoTask.id,
        status: demoTask.status === "queued" ? "queued" as const
          : demoTask.status === "processing" ? "running" as const
          : demoTask.status === "completed" ? "completed" as const
          : "failed" as const,
        prompt: demoTask.prompt,
        result: demoTask.response ?? null,
        agentName: demoTask.agentName,
        currentAction: null,
        error: null,
      };
    }
    const found = supabaseTasks.find((t) => t.id === taskId);
    return found ? toDisplayTask(found) : null;
  }, [supabaseTasks, taskId, demoTask]);

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
        const html = markdownToHtml(task.result);
        editor.chain().focus().command(({ tr, state }) => {
          const $pos = state.doc.resolve(nodePos!);
          const from = $pos.before($pos.depth);
          const to = $pos.after($pos.depth);

          const wrapper = document.createElement("div");
          wrapper.innerHTML = html;
          const parsed = ProseDOMParser.fromSchema(state.schema).parse(wrapper);

          tr.replaceWith(from, to, parsed.content);
          return true;
        }).run();
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
    const wsId = (node.attrs.schoolId as string) || "";
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

    if (demo) {
      demo.triggerAgentResponse(agentId, prompt, docId).catch(() => {});
    }

    createInlineAgentTask(editor, agent, prompt, docId, docTitle, wsId, uid)
      .then((resultTaskId) => {
        if (resultTaskId) updateAttributes({ taskId: resultTaskId });
      })
      .catch(() => {
        deleteNode();
      });
  }, [node.attrs, editor, updateAttributes, deleteNode, demo]);

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
        <div className="relative my-2 w-full" contentEditable={false}>
          <InlineAgentPromptCard
            agentName={(node.attrs.agentName as string) || "Agent"}
            agentAvatar={(node.attrs.agentAvatar as string) || "🤖"}
            agentColor={(node.attrs.agentColor as string) || "#8B5CF6"}
            promptValue={(node.attrs.submittedPrompt as string) || ""}
            onSubmit={handlePromptSubmit}
            onCancel={handlePromptCancel}
            interactive
          />
        </div>
      </NodeViewWrapper>
    );
  }

  // ── Queued / Processing — unified block ────────────────────────
  const agentName = (node.attrs.agentName as string) || "Agent";
  const agentColor = (node.attrs.agentColor as string) || "#8B5CF6";
  const agentAvatarStr = (node.attrs.agentAvatar as string) || "";
  const promptText = (node.attrs.submittedPrompt as string) || task?.prompt || "";
  const isQueued = !task || task.status === "queued";
  const isRunning = task?.status === "running";
  const isCompleted = task?.status === "completed";
  const isFailed = task?.status === "failed";
  const isActive = isQueued || isRunning;

  if (isActive || isFailed) {
    return (
      <NodeViewWrapper className="inline-agent-node">
        <div className="relative my-2 w-full" contentEditable={false}>
          <InlineAgentProcessingCard
            agentName={agentName}
            agentAvatar={agentAvatarStr}
            agentColor={agentColor}
            prompt={promptText}
            currentAction={task?.currentAction ?? undefined}
            state={isFailed ? "failed" : isQueued ? "queued" : "running"}
            error={task?.error}
            onCancel={() => handleCancelTask(task?.id ?? taskId ?? "")}
            onEdit={handleEdit}
          />
        </div>
      </NodeViewWrapper>
    );
  }

  // Completed with proposals
  if (isCompleted && taskProposals.length > 0) {
    return (
      <NodeViewWrapper className="inline-agent-node">
        <div className="relative my-2 w-full space-y-2" contentEditable={false}>
          {taskProposals.map((proposal) => {
            const content = (proposal.proposed_content as Record<string, unknown>)?.text as string
              ?? task.result ?? "";
            return (
              <InlineAgentResponseCard
                key={proposal.id}
                agentName={`${agentName} — ${proposal.edit_type}`}
                agentAvatar={agentAvatarStr}
                agentColor={agentColor}
                prompt={promptText}
                result={content}
                resultHtml={markdownToHtml(content)}
                onAccept={() => handleAcceptProposal(proposal.id)}
                onReject={() => handleRejectProposal(proposal.id)}
              />
            );
          })}
        </div>
      </NodeViewWrapper>
    );
  }

  // Completed with result
  if (isCompleted && task.result) {
    return (
      <NodeViewWrapper className="inline-agent-node">
        <div className="relative my-2 w-full" contentEditable={false}>
          <InlineAgentResponseCard
            agentName={agentName}
            agentAvatar={agentAvatarStr}
            agentColor={agentColor}
            prompt={promptText}
            result={task.result}
            resultHtml={markdownToHtml(task.result)}
            onAccept={handleAcceptResult}
            onReject={() => deleteNode()}
          />
        </div>
      </NodeViewWrapper>
    );
  }

  // Fallback: cancelled or unknown status — silently remove the node
  useEffect(() => {
    deleteNode();
  }, [deleteNode]);

  return null;
}
