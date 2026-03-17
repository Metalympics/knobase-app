"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useState, useCallback, lazy, Suspense } from "react";
import { BarChart3, Pencil, Trash2, GripVertical } from "lucide-react";
import type { ChartConfig } from "@/lib/editor/extensions/chart-extension";

const ChartRenderer = lazy(() =>
  import("./ChartRenderer").then((m) => ({ default: m.ChartRenderer })),
);
const ChartEditModal = lazy(() =>
  import("./ChartEditModal").then((m) => ({ default: m.ChartEditModal })),
);

export function ChartBlockView(props: NodeViewProps) {
  const { node, updateAttributes, deleteNode, editor } = props;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const { type, data, config } = node.attrs;

  const handleSave = useCallback(
    (
      newData: Array<Record<string, unknown>>,
      newConfig: ChartConfig,
      newType: string,
    ) => {
      updateAttributes({ data: newData, config: newConfig, type: newType });
      setIsModalOpen(false);
    },
    [updateAttributes],
  );

  const isEditable = editor.isEditable;

  return (
    <NodeViewWrapper className="chart-block-wrapper my-4" data-drag-handle>
      <div
        className="group relative rounded-lg border border-neutral-200 bg-white transition-shadow hover:shadow-md"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isEditable && isHovered && (
          <div className="absolute -top-3 right-2 z-10 flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-1 py-0.5 shadow-sm">
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
              title="Edit chart"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <div
              className="cursor-grab p-1 text-neutral-300 hover:text-neutral-500"
              contentEditable={false}
              data-drag-handle
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
            <button
              onClick={deleteNode}
              className="rounded p-1 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
              title="Delete chart"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {config?.title && (
          <div className="border-b border-neutral-100 px-4 pt-3 pb-2">
            <h4 className="text-sm font-semibold text-neutral-700">
              {config.title}
            </h4>
          </div>
        )}

        <div
          className="cursor-pointer p-4"
          onClick={() => isEditable && setIsModalOpen(true)}
        >
          {data && data.length > 0 ? (
            <Suspense
              fallback={
                <div className="flex h-[300px] items-center justify-center text-neutral-400">
                  Loading chart...
                </div>
              }
            >
              <ChartRenderer type={type} data={data} config={config} />
            </Suspense>
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-neutral-400">
              <BarChart3 className="h-8 w-8" />
              <span className="text-sm">Click to add chart data</span>
            </div>
          )}
        </div>

        {isModalOpen && (
          <Suspense fallback={null}>
            <ChartEditModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              data={data || []}
              config={config || {}}
              chartType={type || "bar"}
              onSave={handleSave}
            />
          </Suspense>
        )}
      </div>
    </NodeViewWrapper>
  );
}
