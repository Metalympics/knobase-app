"use client";

import { useMemo } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { getBacklinks, getOutgoingLinks } from "@/lib/relationships/graph";

interface BacklinksPanelProps {
  documentId: string;
  onNavigate: (docId: string) => void;
}

export function BacklinksPanel({ documentId, onNavigate }: BacklinksPanelProps) {
  const backlinks = useMemo(() => getBacklinks(documentId), [documentId]);
  const outgoing = useMemo(() => getOutgoingLinks(documentId), [documentId]);

  if (backlinks.length === 0 && outgoing.length === 0) return null;

  return (
    <div className="mt-12 border-t border-[#e5e5e5] pt-6">
      {backlinks.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            <ArrowLeft className="h-3 w-3" />
            Linked References ({backlinks.length})
          </h3>
          <div className="space-y-2">
            {backlinks.map((bl) => (
              <button
                key={bl.doc.id}
                onClick={() => onNavigate(bl.doc.id)}
                className="flex w-full items-start gap-2.5 rounded-lg border border-[#e5e5e5] p-3 text-left transition-colors hover:bg-neutral-50"
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-neutral-900">
                    {bl.doc.title || "Untitled"}
                  </div>
                  {bl.context && (
                    <div className="mt-0.5 truncate text-xs text-neutral-400">
                      {bl.context.replace(/\[\[|\]\]/g, "")}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Outgoing Links ({outgoing.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {outgoing.map((link) => (
              <button
                key={link.title}
                onClick={() => link.targetId && onNavigate(link.targetId)}
                disabled={!link.targetId}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  link.targetId
                    ? "border-[#e5e5e5] text-neutral-600 hover:bg-neutral-50"
                    : "border-dashed border-neutral-300 text-neutral-400"
                }`}
              >
                {link.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
