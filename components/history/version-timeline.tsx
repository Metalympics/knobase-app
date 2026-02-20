"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Clock,
  Star,
  Trash2,
  RotateCcw,
  X,
  GitCompare,
  Pencil,
} from "lucide-react";
import {
  getVersions,
  nameVersion,
  deleteVersion,
  type Version,
} from "@/lib/history/versions";

interface VersionTimelineProps {
  documentId: string;
  onRestore: (content: string) => void;
  onCompare: (versionA: Version, versionB: Version) => void;
  onClose: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function VersionTimeline({
  documentId,
  onRestore,
  onCompare,
  onClose,
}: VersionTimelineProps) {
  const [versions, setVersions] = useState(() => getVersions(documentId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const refresh = useCallback(() => {
    setVersions(getVersions(documentId));
  }, [documentId]);

  const handleName = useCallback(
    (versionId: string) => {
      if (editName.trim()) {
        nameVersion(documentId, versionId, editName.trim());
        refresh();
      }
      setEditingId(null);
    },
    [documentId, editName, refresh]
  );

  const handleDelete = useCallback(
    (versionId: string) => {
      deleteVersion(documentId, versionId);
      refresh();
    },
    [documentId, refresh]
  );

  const handleCompare = useCallback(() => {
    if (selected.length !== 2) return;
    const a = versions.find((v) => v.id === selected[0]);
    const b = versions.find((v) => v.id === selected[1]);
    if (a && b) onCompare(a, b);
  }, [selected, versions, onCompare]);

  const toggleSelect = useCallback(
    (id: string) => {
      setSelected((prev) => {
        if (prev.includes(id)) return prev.filter((s) => s !== id);
        if (prev.length >= 2) return [prev[1], id];
        return [...prev, id];
      });
    },
    []
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#e5e5e5] px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">Version History</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setCompareMode(!compareMode);
              setSelected([]);
            }}
            className={`rounded px-2 py-1 text-xs transition-colors ${
              compareMode
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:bg-neutral-100"
            }`}
          >
            <GitCompare className="inline h-3 w-3" /> Compare
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {compareMode && selected.length === 2 && (
        <div className="border-b border-[#e5e5e5] px-4 py-2">
          <button
            onClick={handleCompare}
            className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
          >
            Compare Selected ({selected.length}/2)
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {versions.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-neutral-400">
            No versions yet. Versions are saved automatically every 5 minutes.
          </div>
        ) : (
          <div className="relative py-2">
            <div className="absolute left-7 top-0 bottom-0 w-px bg-[#e5e5e5]" />
            {versions.map((version, i) => (
              <div key={version.id} className="relative flex gap-3 px-4 py-2">
                {compareMode ? (
                  <button
                    onClick={() => toggleSelect(version.id)}
                    className={`z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-2 transition-colors ${
                      selected.includes(version.id)
                        ? "border-neutral-900 bg-neutral-900"
                        : "border-neutral-300 bg-white"
                    }`}
                  />
                ) : (
                  <div
                    className={`z-10 mt-1 h-3 w-3 shrink-0 rounded-full ${
                      version.name
                        ? "bg-amber-400 ring-2 ring-amber-100"
                        : "border-2 border-neutral-300 bg-white"
                    }`}
                  />
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {editingId === version.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => handleName(version.id)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleName(version.id)
                        }
                        className="flex-1 rounded border border-[#e5e5e5] px-1.5 py-0.5 text-xs outline-none focus:border-neutral-400"
                        autoFocus
                        placeholder="Name this version..."
                      />
                    ) : (
                      <span className="text-xs font-medium text-neutral-900">
                        {version.name ?? formatTime(version.timestamp)}
                      </span>
                    )}
                    {version.name && (
                      <Star className="h-3 w-3 text-amber-400" />
                    )}
                  </div>
                  {version.name && (
                    <div className="text-[10px] text-neutral-400">
                      {formatTime(version.timestamp)}
                    </div>
                  )}
                  <div className="text-[10px] text-neutral-400">
                    {version.author}
                  </div>

                  {!compareMode && (
                    <div className="mt-1 flex items-center gap-1">
                      <button
                        onClick={() => onRestore(version.content)}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-neutral-500 hover:bg-neutral-100"
                      >
                        <RotateCcw className="h-2.5 w-2.5" /> Restore
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(version.id);
                          setEditName(version.name ?? "");
                        }}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-neutral-500 hover:bg-neutral-100"
                      >
                        <Pencil className="h-2.5 w-2.5" /> Name
                      </button>
                      <button
                        onClick={() => handleDelete(version.id)}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-red-400 hover:bg-red-50"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
