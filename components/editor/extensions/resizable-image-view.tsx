"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
} from "lucide-react";

type Handle = "e" | "w" | "se" | "sw";

const HANDLE_META: Record<Handle, { cursor: string; className: string }> = {
  e: { cursor: "ew-resize", className: "right-0 top-1/2 -translate-y-1/2 translate-x-1/2 h-10 w-1.5 rounded-full" },
  w: { cursor: "ew-resize", className: "left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 h-10 w-1.5 rounded-full" },
  se: { cursor: "nwse-resize", className: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 h-3 w-3 rounded-full" },
  sw: { cursor: "nesw-resize", className: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 h-3 w-3 rounded-full" },
};

export function ResizableImageView({ node, updateAttributes, deleteNode, selected, editor }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState<Handle | null>(null);
  const [naturalAspect, setNaturalAspect] = useState(1);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const src = node.attrs.src as string | null;
  const width = node.attrs.width as number | null;
  const align = (node.attrs.align as string) || "center";

  const handleLoad = useCallback(() => {
    if (!imgRef.current) return;
    const { naturalWidth, naturalHeight } = imgRef.current;
    if (naturalHeight > 0) setNaturalAspect(naturalWidth / naturalHeight);
  }, []);

  const onPointerDown = useCallback(
    (handle: Handle, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(handle);
      startX.current = e.clientX;
      startWidth.current = imgRef.current?.getBoundingClientRect().width ?? 400;
    },
    []
  );

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - startX.current;
      const direction = dragging === "w" || dragging === "sw" ? -1 : 1;
      const newWidth = Math.max(100, Math.round(startWidth.current + dx * direction));

      const maxWidth = wrapperRef.current?.parentElement?.clientWidth ?? 800;
      updateAttributes({ width: Math.min(newWidth, maxWidth) });
    };

    const onUp = () => setDragging(null);

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [dragging, updateAttributes]);

  const showControls = hovered || selected || !!dragging;

  if (!src) return null;

  const alignClass =
    align === "left"
      ? "mr-auto"
      : align === "right"
        ? "ml-auto"
        : "mx-auto";

  return (
    <NodeViewWrapper className="my-3" data-drag-handle>
      <div
        ref={wrapperRef}
        className={`group relative inline-block ${alignClass}`}
        style={{ width: width ? `${width}px` : undefined, maxWidth: "100%" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { if (!dragging) setHovered(false); }}
      >
        {/* Image */}
        <img
          ref={imgRef}
          src={src}
          alt={node.attrs.alt ?? ""}
          title={node.attrs.title ?? undefined}
          onLoad={handleLoad}
          draggable={false}
          className={`block w-full rounded-lg select-none transition-shadow ${
            selected ? "ring-2 ring-blue-500 ring-offset-2" : ""
          }`}
        />

        {/* Hover overlay gradient (subtle) */}
        {showControls && !dragging && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 rounded-t-lg bg-gradient-to-b from-black/30 to-transparent" />
        )}

        {/* Top toolbar */}
        {showControls && !dragging && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <ToolbarBtn
              icon={<AlignLeft className="h-3.5 w-3.5" />}
              active={align === "left"}
              onClick={() => updateAttributes({ align: "left" })}
              title="Align left"
            />
            <ToolbarBtn
              icon={<AlignCenter className="h-3.5 w-3.5" />}
              active={align === "center"}
              onClick={() => updateAttributes({ align: "center" })}
              title="Align center"
            />
            <ToolbarBtn
              icon={<AlignRight className="h-3.5 w-3.5" />}
              active={align === "right"}
              onClick={() => updateAttributes({ align: "right" })}
              title="Align right"
            />
            <div className="mx-0.5 h-4 w-px bg-white/30" />
            <ToolbarBtn
              icon={<Maximize2 className="h-3.5 w-3.5" />}
              onClick={() => updateAttributes({ width: null })}
              title="Full width"
            />
            <ToolbarBtn
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={deleteNode}
              title="Delete image"
              danger
            />
          </div>
        )}

        {/* Width label while dragging */}
        {dragging && width && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white tabular-nums">
            {width}px
          </div>
        )}

        {/* Resize handles */}
        {showControls &&
          (Object.entries(HANDLE_META) as [Handle, typeof HANDLE_META[Handle]][]).map(
            ([handle, meta]) => (
              <div
                key={handle}
                className={`absolute z-10 ${meta.className} ${
                  dragging === handle
                    ? "bg-blue-500 scale-110"
                    : "bg-blue-500/80 hover:bg-blue-500 hover:scale-110"
                } transition-transform shadow-sm`}
                style={{ cursor: meta.cursor }}
                onPointerDown={(e) => onPointerDown(handle, e)}
              />
            )
          )}
      </div>
    </NodeViewWrapper>
  );
}

function ToolbarBtn({
  icon,
  onClick,
  title,
  active,
  danger,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        danger
          ? "text-white/80 hover:bg-red-500/80 hover:text-white"
          : active
            ? "bg-white/30 text-white"
            : "text-white/80 hover:bg-white/20 hover:text-white"
      }`}
    >
      {icon}
    </button>
  );
}
