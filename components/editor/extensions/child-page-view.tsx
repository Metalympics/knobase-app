"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { FileText, ChevronRight } from "lucide-react";
import { useRouter, useParams } from "next/navigation";

export function ChildPageView({ node }: NodeViewProps) {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params?.schoolId as string | undefined;

  const { pageId, title, icon } = node.attrs;

  const handleClick = () => {
    if (workspaceId) {
      router.push(`/s/${workspaceId}/d/${pageId}`);
    } else {
      router.push(`/d/${pageId}`);
    }
  };

  return (
    <NodeViewWrapper className="my-1">
      <button
        onClick={handleClick}
        className="group flex w-full items-center gap-2.5 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-left transition-all hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm"
        contentEditable={false}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center">
          {icon ? (
            <span className="text-base">{icon}</span>
          ) : (
            <FileText className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600" />
          )}
        </span>
        <span className="flex-1 truncate text-sm font-medium text-neutral-700 group-hover:text-neutral-900">
          {title || "Untitled"}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-500" />
      </button>
    </NodeViewWrapper>
  );
}
