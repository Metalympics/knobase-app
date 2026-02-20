"use client";

import { Editor } from "@tiptap/react";
import { CheckSquare } from "lucide-react";

interface TaskListBlockProps {
  editor: Editor;
}

export function TaskListBlock({ editor }: TaskListBlockProps) {
  if (!editor.isActive("taskList")) return null;

  const doc = editor.state.doc;
  let total = 0;
  let checked = 0;

  doc.descendants((node) => {
    if (node.type.name === "taskItem") {
      total++;
      if (node.attrs.checked) checked++;
    }
  });

  if (total === 0) return null;

  const pct = Math.round((checked / total) * 100);

  return (
    <div className="mb-2 flex items-center gap-2 text-xs text-neutral-400">
      <CheckSquare className="h-3 w-3" />
      <span>
        {checked}/{total} completed
      </span>
      <div className="h-1 w-20 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-green-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span>{pct}%</span>
    </div>
  );
}
