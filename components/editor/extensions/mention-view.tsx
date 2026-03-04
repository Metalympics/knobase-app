"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useMemo } from "react";
import { PendingBlock } from "@/components/editor/pending-block";
import { useDocumentTasks } from "@/hooks/use-agent-tasks";
import { toDisplayTask } from "@/lib/agents/task-types";
import type { Mention } from "@/lib/mentions/types";
import { getInitial } from "@/lib/mentions/store";
import { Bot } from "lucide-react";

export function MentionNodeView({ node }: NodeViewProps) {
  const mention = node.attrs.mention as Mention;

  if (mention.type === 'human') {
    return (
      <NodeViewWrapper className="inline mention-node">
        <span
          className="mention-badge human-to-user"
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

  if (mention.type === 'agent-to-human') {
    return (
      <NodeViewWrapper className="inline mention-node">
        <span
          className="mention-badge agent-to-user"
          contentEditable={false}
          title={`${mention.sourceAgentName} mentioned ${mention.targetName}`}
        >
          <Bot className="h-3 w-3 shrink-0" />
          <span className="text-[11px] opacity-70">{mention.sourceAgentName} →</span>
          <span className="text-sm font-medium">@{mention.targetName}</span>
        </span>
      </NodeViewWrapper>
    );
  }

  if (mention.type === 'agent-to-agent') {
    return (
      <NodeViewWrapper className="inline mention-node">
        <span
          className="mention-badge agent-to-agent"
          contentEditable={false}
          title={`${mention.sourceAgentName} mentioned ${mention.targetAgentName}`}
        >
          <Bot className="h-3 w-3 shrink-0" />
          <span className="text-[11px] opacity-70">{mention.sourceAgentName} →</span>
          <span className="text-sm font-medium">@{mention.targetAgentName}</span>
        </span>
      </NodeViewWrapper>
    );
  }

  // AI mention (type === 'ai') - show pending block
  if (mention.type === 'ai') {
    return <AITaskMention taskId={mention.taskId} documentId={node.attrs.documentId as string | undefined} />;
  }

  return null;
}

function AITaskMention({ taskId, documentId }: { taskId?: string; documentId?: string }) {
  const { tasks: supabaseTasks, cancel: cancelSupabaseTask } = useDocumentTasks(documentId ?? null);

  const task = useMemo(() => {
    if (!taskId) return null;
    const found = supabaseTasks.find((t) => t.id === taskId);
    return found ? toDisplayTask(found) : null;
  }, [supabaseTasks, taskId]);

  if (!task) {
    return (
      <NodeViewWrapper className="inline-agent-node">
        <span className="text-neutral-400">Loading AI task...</span>
      </NodeViewWrapper>
    );
  }

  const handleCancel = (id: string) => {
    cancelSupabaseTask(id);
  };

  return (
    <NodeViewWrapper className="inline-agent-node">
      <PendingBlock task={task} onCancel={handleCancel} />
    </NodeViewWrapper>
  );
}
