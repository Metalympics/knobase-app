"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useMemo } from "react";
import { PendingBlock } from "@/components/editor/pending-block";
import { useTaskStore } from "@/lib/agents/task-store";

export function InlineAgentNodeView({ node, deleteNode }: NodeViewProps) {
  const taskId = node.attrs.taskId as string;
  const { tasks, cancelTask } = useTaskStore();

  const task = useMemo(() => {
    return tasks.find((t) => t.id === taskId);
  }, [tasks, taskId]);

  const handleCancel = (id: string) => {
    cancelTask(id);
    deleteNode();
  };

  if (!task) {
    return (
      <NodeViewWrapper className="inline-agent-node">
        <span className="text-neutral-400">Loading...</span>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="inline-agent-node">
      <PendingBlock task={task} onCancel={handleCancel} />
    </NodeViewWrapper>
  );
}
