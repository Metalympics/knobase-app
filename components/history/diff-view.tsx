"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import { diffVersions, type Version, type DiffLine } from "@/lib/history/versions";

interface DiffViewProps {
  versionA: Version;
  versionB: Version;
  onClose: () => void;
  onAccept: (content: string) => void;
}

export function DiffView({ versionA, versionB, onClose, onAccept }: DiffViewProps) {
  const older =
    new Date(versionA.timestamp) < new Date(versionB.timestamp)
      ? versionA
      : versionB;
  const newer =
    older === versionA ? versionB : versionA;

  const diff = useMemo(
    () => diffVersions(older.content, newer.content),
    [older.content, newer.content]
  );

  const stats = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const line of diff) {
      if (line.type === "added") added++;
      if (line.type === "removed") removed++;
    }
    return { added, removed };
  }, [diff]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#e5e5e5] px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Diff View</h3>
          <div className="mt-0.5 text-[10px] text-neutral-400">
            {older.name ?? new Date(older.timestamp).toLocaleString()} →{" "}
            {newer.name ?? new Date(newer.timestamp).toLocaleString()}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-3 border-b border-[#e5e5e5] px-4 py-2 text-xs">
        <span className="text-green-600">+{stats.added} added</span>
        <span className="text-red-500">-{stats.removed} removed</span>
      </div>

      <div className="flex-1 overflow-y-auto font-mono text-xs">
        {diff.map((line, i) => (
          <div
            key={i}
            className={`flex ${
              line.type === "added"
                ? "bg-green-50"
                : line.type === "removed"
                ? "bg-red-50"
                : ""
            }`}
          >
            <span
              className={`w-6 shrink-0 select-none text-right ${
                line.type === "added"
                  ? "text-green-400"
                  : line.type === "removed"
                  ? "text-red-400"
                  : "text-neutral-300"
              }`}
            >
              {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
            </span>
            <span
              className={`flex-1 whitespace-pre-wrap px-3 py-0.5 ${
                line.type === "added"
                  ? "text-green-700"
                  : line.type === "removed"
                  ? "text-red-600"
                  : "text-neutral-600"
              }`}
            >
              {line.text || "\u00A0"}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-t border-[#e5e5e5] px-4 py-3">
        <button
          onClick={() => onAccept(newer.content)}
          className="flex-1 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
        >
          Restore Newer Version
        </button>
        <button
          onClick={() => onAccept(older.content)}
          className="flex-1 rounded-md border border-[#e5e5e5] px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Restore Older Version
        </button>
      </div>
    </div>
  );
}
