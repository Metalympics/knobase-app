"use client";

import { Editor } from "@tiptap/react";
import { Plus, Minus } from "lucide-react";

interface TableBlockProps {
  editor: Editor;
}

export function TableBlock({ editor }: TableBlockProps) {
  if (!editor.isActive("table")) return null;

  return (
    <div className="mb-1 flex items-center gap-1 rounded-md border border-[#e5e5e5] bg-[#fafafa] px-2 py-1">
      <button
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100"
        title="Add column"
      >
        <Plus className="h-3 w-3" /> Col
      </button>
      <button
        onClick={() => editor.chain().focus().deleteColumn().run()}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100"
        title="Remove column"
      >
        <Minus className="h-3 w-3" /> Col
      </button>
      <div className="mx-1 h-3 w-px bg-neutral-200" />
      <button
        onClick={() => editor.chain().focus().addRowAfter().run()}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100"
        title="Add row"
      >
        <Plus className="h-3 w-3" /> Row
      </button>
      <button
        onClick={() => editor.chain().focus().deleteRow().run()}
        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100"
        title="Remove row"
      >
        <Minus className="h-3 w-3" /> Row
      </button>
      <div className="mx-1 h-3 w-px bg-neutral-200" />
      <button
        onClick={() => editor.chain().focus().deleteTable().run()}
        className="rounded px-1.5 py-0.5 text-xs text-red-400 hover:bg-red-50"
        title="Delete table"
      >
        Delete
      </button>
    </div>
  );
}
