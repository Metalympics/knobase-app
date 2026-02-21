"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useMemo } from "react";
import { PendingBlock } from "@/components/editor/pending-block";
import { useTaskStore } from "@/lib/agents/task-store";
import type { Mention } from "@/lib/mentions/types";
import { getInitial } from "@/lib/mentions/store";

export function MentionNodeView({ node }: NodeViewProps) {
  const mention = node.attrs.mention as Mention;

  if (mention.type === 'human') {
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

  // AI mention - show pending block
  return <AITaskMention taskId={mention.taskId} />;
}

function AITaskMention({ taskId }: { taskId?: string }) {
  const { tasks, cancelTask } = useTaskStore();

  const task = useMemo(() => {
    if (!taskId) return null;
    return tasks.find((t) => t.id === taskId);
  }, [tasks, taskId]);

  if (!task) {
    return (
      <NodeViewWrapper className="inline-agent-node">
        <span className="text-neutral-400">Loading AI task...</span>
      </NodeViewWrapper>
    );
  }

  const handleCancel = (id: string) => {
    cancelTask(id);
  };

  return (
    <NodeViewWrapper className="inline-agent-node">
      <PendingBlock task={task} onCancel={handleCancel} />
    </NodeViewWrapper>
  );
}
