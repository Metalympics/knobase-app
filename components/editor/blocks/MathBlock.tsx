"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import { X } from "lucide-react";

interface MathBlockProps {
  editor: Editor;
  onClose: () => void;
}

export function MathBlock({ editor, onClose }: MathBlockProps) {
  const [latex, setLatex] = useState("");
  const [rendered, setRendered] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!latex.trim()) {
      setRendered("");
      return;
    }

    let cancelled = false;
    import("katex").then((katex) => {
      if (cancelled) return;
      try {
        const html = katex.default.renderToString(latex, {
          throwOnError: false,
          displayMode: true,
        });
        setRendered(html);
      } catch {
        setRendered('<span style="color:#ef4444">Invalid LaTeX</span>');
      }
    });
    return () => { cancelled = true; };
  }, [latex]);

  const insertMath = useCallback(() => {
    if (!latex.trim()) return;

    editor
      .chain()
      .focus()
      .insertContent({
        type: "paragraph",
        content: [{ type: "text", text: `$$${latex}$$` }],
      })
      .run();
    onClose();
  }, [editor, latex, onClose]);

  return (
    <div className="rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
          <span className="text-base">∑</span>
          Math Block
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <textarea
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        placeholder="E = mc^2"
        rows={3}
        className="mb-2 w-full rounded-md border border-[#e5e5e5] px-2.5 py-1.5 font-mono text-sm outline-none focus:border-neutral-400"
        autoFocus
      />

      {rendered && (
        <div
          ref={previewRef}
          className="mb-3 rounded-md bg-[#fafafa] p-3 text-center"
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      )}

      <button
        onClick={insertMath}
        disabled={!latex.trim()}
        className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
      >
        Insert Math
      </button>
    </div>
  );
}
