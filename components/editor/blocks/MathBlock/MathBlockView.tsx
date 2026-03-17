"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Pencil, Check, X } from "lucide-react";

export function MathBlockView({ node, updateAttributes, editor }: NodeViewProps) {
  const { latex } = node.attrs;
  const [isEditing, setIsEditing] = useState(!latex);
  const [editValue, setEditValue] = useState(latex || "");
  const [rendered, setRendered] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const src = isEditing ? editValue : latex;
    if (!src?.trim()) {
      setRendered("");
      return;
    }

    let cancelled = false;
    import("katex").then((katex) => {
      if (cancelled) return;
      try {
        setRendered(
          katex.default.renderToString(src, {
            throwOnError: false,
            displayMode: true,
          }),
        );
      } catch {
        setRendered('<span style="color:#ef4444">Invalid LaTeX</span>');
      }
    });
    return () => { cancelled = true; };
  }, [latex, editValue, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    updateAttributes({ latex: editValue });
    setIsEditing(false);
  }, [editValue, updateAttributes]);

  const handleCancel = useCallback(() => {
    setEditValue(latex);
    setIsEditing(false);
  }, [latex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel],
  );

  const isEditable = editor.isEditable;

  return (
    <NodeViewWrapper className="math-block-wrapper my-3">
      <div
        className={`group relative rounded-lg border transition-colors ${
          isEditing
            ? "border-indigo-200 bg-indigo-50/30"
            : "border-neutral-200 bg-white hover:border-neutral-300"
        }`}
      >
        {isEditing ? (
          <div className="p-3">
            <textarea
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="LaTeX expression (e.g. E = mc^2)"
              rows={2}
              className="w-full resize-none rounded-md border border-neutral-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-indigo-300"
            />
            {rendered && (
              <div
                className="mt-2 overflow-x-auto rounded-md bg-white p-3 text-center"
                dangerouslySetInnerHTML={{ __html: rendered }}
              />
            )}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-neutral-400">
                Cmd+Enter to save, Esc to cancel
              </span>
              <div className="flex gap-1">
                <button
                  onClick={handleCancel}
                  className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleSave}
                  className="rounded bg-indigo-600 p-1 text-white hover:bg-indigo-700"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="cursor-pointer px-4 py-3"
            onClick={() => isEditable && setIsEditing(true)}
          >
            {rendered ? (
              <div className="relative">
                <div
                  className="overflow-x-auto text-center"
                  dangerouslySetInnerHTML={{ __html: rendered }}
                />
                {isEditable && (
                  <button
                    className="absolute top-0 right-0 rounded p-1 text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-neutral-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-neutral-400">
                <span className="text-lg font-bold">∑</span>
                Click to add math expression
              </div>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
