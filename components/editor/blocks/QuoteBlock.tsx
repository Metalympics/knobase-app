"use client";

import { useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { Quote, X } from "lucide-react";

interface QuoteBlockProps {
  editor: Editor;
  onClose: () => void;
}

export function QuoteBlock({ editor, onClose }: QuoteBlockProps) {
  const [text, setText] = useState("");
  const [attribution, setAttribution] = useState("");

  const insertQuote = useCallback(() => {
    if (!text.trim()) return;

    const content = attribution.trim()
      ? `${text.trim()}\n\n— ${attribution.trim()}`
      : text.trim();

    editor
      .chain()
      .focus()
      .insertContent({
        type: "blockquote",
        content: content.split("\n\n").map((line) => ({
          type: "paragraph",
          content: [{ type: "text", text: line }],
        })),
      })
      .run();
    onClose();
  }, [editor, text, attribution, onClose]);

  return (
    <div className="rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
          <Quote className="h-4 w-4" />
          Blockquote
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Quote text..."
        rows={3}
        className="mb-2 w-full rounded-md border border-[#e5e5e5] px-2.5 py-1.5 text-sm outline-none focus:border-neutral-400"
        autoFocus
      />
      <input
        type="text"
        value={attribution}
        onChange={(e) => setAttribution(e.target.value)}
        placeholder="Attribution (optional)"
        className="mb-3 w-full rounded-md border border-[#e5e5e5] px-2.5 py-1.5 text-sm outline-none focus:border-neutral-400"
        onKeyDown={(e) => e.key === "Enter" && insertQuote()}
      />
      <button
        onClick={insertQuote}
        disabled={!text.trim()}
        className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
      >
        Insert Quote
      </button>
    </div>
  );
}
