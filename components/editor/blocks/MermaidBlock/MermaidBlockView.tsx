"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Pencil, Check, X, GitBranch, Copy, Download } from "lucide-react";

let mermaidCounter = 0;

export function MermaidBlockView({ node, updateAttributes, editor, deleteNode }: NodeViewProps) {
  const { code } = node.attrs;
  const [isEditing, setIsEditing] = useState(!code);
  const [editValue, setEditValue] = useState(code || "");
  const [rendered, setRendered] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const src = isEditing ? editValue : code;
    if (!src?.trim()) {
      setRendered("");
      setError(null);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      import("mermaid").then(async (mermaid) => {
        if (cancelled) return;
        try {
          mermaid.default.initialize({
            startOnLoad: false,
            theme: "neutral",
            securityLevel: "loose",
          });
          const id = `mermaid-${++mermaidCounter}`;
          const { svg } = await mermaid.default.render(id, src);
          if (!cancelled) {
            setRendered(svg);
            setError(null);
          }
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : "Invalid diagram");
            setRendered("");
          }
        }
      });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, editValue, isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    updateAttributes({ code: editValue });
    setIsEditing(false);
  }, [editValue, updateAttributes]);

  const handleCancel = useCallback(() => {
    setEditValue(code);
    setIsEditing(false);
  }, [code]);

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
      if (e.key === "Tab") {
        e.preventDefault();
        const target = e.target as HTMLTextAreaElement;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const newValue = editValue.substring(0, start) + "    " + editValue.substring(end);
        setEditValue(newValue);
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = start + 4;
        });
      }
    },
    [handleSave, handleCancel, editValue],
  );

  const handleCopySvg = useCallback(() => {
    if (rendered) navigator.clipboard.writeText(rendered);
  }, [rendered]);

  const handleDownloadSvg = useCallback(() => {
    if (!rendered) return;
    const blob = new Blob([rendered], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    a.click();
    URL.revokeObjectURL(url);
  }, [rendered]);

  const isEditable = editor.isEditable;

  return (
    <NodeViewWrapper className="mermaid-block-wrapper my-4">
      <div
        className={`group relative rounded-lg border transition-colors ${
          isEditing
            ? "border-emerald-200 bg-emerald-50/20"
            : "border-neutral-200 bg-white hover:border-neutral-300"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-neutral-500">
            <GitBranch className="h-3.5 w-3.5" />
            Mermaid Diagram
          </div>
          <div className="flex items-center gap-0.5">
            {!isEditing && rendered && (
              <>
                <button
                  onClick={handleCopySvg}
                  className="rounded p-1 text-neutral-300 hover:text-neutral-500"
                  title="Copy SVG"
                >
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  onClick={handleDownloadSvg}
                  className="rounded p-1 text-neutral-300 hover:text-neutral-500"
                  title="Download SVG"
                >
                  <Download className="h-3 w-3" />
                </button>
              </>
            )}
            {isEditable && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="rounded p-1 text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-neutral-500"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="p-3">
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="graph TD&#10;    A[Start] --> B[End]"
              rows={8}
              className="w-full resize-y rounded-md border border-neutral-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed outline-none focus:border-emerald-300"
            />
            {error && (
              <div className="mt-1 text-[10px] text-red-500">{error}</div>
            )}
            {rendered && !error && (
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
                  className="rounded bg-emerald-600 p-1 text-white hover:bg-emerald-700"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="cursor-pointer overflow-x-auto p-4"
            onClick={() => isEditable && setIsEditing(true)}
          >
            {rendered ? (
              <div
                className="flex justify-center [&>svg]:max-w-full"
                dangerouslySetInnerHTML={{ __html: rendered }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-neutral-400">
                <GitBranch className="h-8 w-8" />
                <span className="text-sm">Click to add a Mermaid diagram</span>
              </div>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
