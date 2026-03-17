"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useState, useEffect, useRef, useCallback } from "react";

export function MathInlineView({ node, updateAttributes, editor }: NodeViewProps) {
  const { latex } = node.attrs;
  const [isEditing, setIsEditing] = useState(!latex);
  const [editValue, setEditValue] = useState(latex || "");
  const [rendered, setRendered] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
            displayMode: false,
          }),
        );
      } catch {
        setRendered('<span style="color:#ef4444">?</span>');
      }
    });
    return () => { cancelled = true; };
  }, [latex, editValue, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    updateAttributes({ latex: editValue });
    setIsEditing(false);
  }, [editValue, updateAttributes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setEditValue(latex);
        setIsEditing(false);
      }
    },
    [handleSave, latex],
  );

  const isEditable = editor.isEditable;

  return (
    <NodeViewWrapper as="span" className="math-inline-wrapper">
      {isEditing ? (
        <span className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50/50 px-1">
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder="LaTeX..."
            className="w-24 bg-transparent py-0.5 font-mono text-xs outline-none"
          />
        </span>
      ) : (
        <span
          className="inline cursor-pointer rounded px-0.5 transition-colors hover:bg-indigo-50"
          onClick={() => isEditable && setIsEditing(true)}
        >
          {rendered ? (
            <span dangerouslySetInnerHTML={{ __html: rendered }} />
          ) : (
            <span className="text-xs text-neutral-400">$...$</span>
          )}
        </span>
      )}
    </NodeViewWrapper>
  );
}
