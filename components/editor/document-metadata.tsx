"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calendar,
  Clock,
  FileText,
  Tag,
  X,
  Plus,
  BookOpen,
} from "lucide-react";
import type { Document } from "@/lib/documents/types";
import { updateDocument } from "@/lib/documents/store";

interface DocumentMetadataProps {
  document: Document;
  onClose: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function estimateReadingTime(wordCount: number): string {
  const mins = Math.ceil(wordCount / 200);
  if (mins < 1) return "< 1 min";
  return `${mins} min`;
}

export function DocumentMetadata({
  document: doc,
  onClose,
}: DocumentMetadataProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTags(doc.tags ?? []);
  }, [doc.tags]);

  const wordCount = useMemo(() => countWords(doc.content), [doc.content]);
  const readingTime = useMemo(
    () => estimateReadingTime(wordCount),
    [wordCount],
  );
  const charCount = useMemo(() => doc.content.length, [doc.content]);

  const addTag = useCallback(() => {
    const tag = newTag.trim().toLowerCase();
    if (!tag || tags.includes(tag)) return;
    const next = [...tags, tag];
    setTags(next);
    setNewTag("");
    saveTags(doc.id, next);
  }, [newTag, tags, doc.id]);

  const removeTag = useCallback(
    (tag: string) => {
      const next = tags.filter((t) => t !== tag);
      setTags(next);
      saveTags(doc.id, next);
    },
    [tags, doc.id],
  );

  if (!mounted) {
    return (
      <div className="flex h-full w-64 flex-col border-l border-[#e5e5e5] bg-[#fafafa]">
        <div className="flex items-center justify-between border-b border-[#e5e5e5] px-4 py-3">
          <h3 className="text-sm font-semibold text-neutral-900">Info</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col border-l border-[#e5e5e5] bg-[#fafafa]">
      <div className="flex items-center justify-between border-b border-[#e5e5e5] px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">Info</h3>
        <button
          onClick={onClose}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-5">
          <section>
            <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              Details
            </h4>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs">
                <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                <div>
                  <div className="text-neutral-500">Created</div>
                  <div className="font-medium text-neutral-700">
                    {formatDate(doc.createdAt)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-xs">
                <Clock className="h-3.5 w-3.5 text-neutral-400" />
                <div>
                  <div className="text-neutral-500">Last edited</div>
                  <div className="font-medium text-neutral-700">
                    {relativeTime(doc.updatedAt)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="h-px bg-[#e5e5e5]" />

          <section>
            <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              Statistics
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-[#e5e5e5] bg-white p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                  <FileText className="h-3 w-3" /> Words
                </div>
                <div className="mt-1 text-lg font-semibold text-neutral-900">
                  {wordCount.toLocaleString()}
                </div>
              </div>
              <div className="rounded-md border border-[#e5e5e5] bg-white p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                  <BookOpen className="h-3 w-3" /> Read time
                </div>
                <div className="mt-1 text-lg font-semibold text-neutral-900">
                  {readingTime}
                </div>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-neutral-400">
              {charCount.toLocaleString()} characters
            </div>
          </section>

          <div className="h-px bg-[#e5e5e5]" />

          <section>
            <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              Tags
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="group flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-1">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                className="flex-1 rounded-md border border-[#e5e5e5] bg-white px-2 py-1 text-xs outline-none focus:border-neutral-400"
                onKeyDown={(e) => e.key === "Enter" && addTag()}
              />
              <button
                onClick={addTag}
                disabled={!newTag.trim()}
                className="rounded-md border border-[#e5e5e5] bg-white px-1.5 text-neutral-400 hover:bg-neutral-50 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function saveTags(docId: string, tags: string[]) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("knobase-app:documents");
    if (!raw) return;
    const docs = JSON.parse(raw);
    const doc = docs.find((d: { id: string }) => d.id === docId);
    if (doc) {
      doc.tags = tags;
      localStorage.setItem("knobase-app:documents", JSON.stringify(docs));
    }
  } catch {
    // ignore
  }
}
