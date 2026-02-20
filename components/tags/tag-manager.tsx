"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Pencil,
  Trash2,
  Merge,
  Tag as TagIcon,
  Check,
} from "lucide-react";
import {
  listTags,
  createTag,
  updateTag,
  deleteTag,
  mergeTags,
  getDocumentTags,
  addTagToDocument,
  removeTagFromDocument,
  type Tag,
} from "@/lib/tags/store";

interface TagManagerProps {
  documentId?: string;
  onClose?: () => void;
  mode?: "manage" | "assign";
}

export function TagManager({
  documentId,
  onClose,
  mode = "manage",
}: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>(listTags);
  const [docTagIds, setDocTagIds] = useState<Set<string>>(
    () => new Set(documentId ? getDocumentTags(documentId).map((t) => t.id) : [])
  );
  const [newTagName, setNewTagName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [mergeSource, setMergeSource] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setTags(listTags());
    if (documentId) {
      setDocTagIds(new Set(getDocumentTags(documentId).map((t) => t.id)));
    }
  }, [documentId]);

  const handleCreate = useCallback(() => {
    if (!newTagName.trim()) return;
    const tag = createTag(newTagName.trim());
    if (documentId) addTagToDocument(documentId, tag.id);
    setNewTagName("");
    refresh();
  }, [newTagName, documentId, refresh]);

  const handleToggleTag = useCallback(
    (tagId: string) => {
      if (!documentId) return;
      if (docTagIds.has(tagId)) {
        removeTagFromDocument(documentId, tagId);
      } else {
        addTagToDocument(documentId, tagId);
      }
      refresh();
    },
    [documentId, docTagIds, refresh]
  );

  const handleRename = useCallback(
    (id: string) => {
      if (editName.trim()) updateTag(id, { name: editName.trim() });
      setEditingId(null);
      refresh();
    },
    [editName, refresh]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteTag(id);
      refresh();
    },
    [refresh]
  );

  const handleMerge = useCallback(
    (targetId: string) => {
      if (!mergeSource) return;
      mergeTags(mergeSource, targetId);
      setMergeSource(null);
      refresh();
    },
    [mergeSource, refresh]
  );

  const handleColorChange = useCallback(
    (id: string, color: string) => {
      updateTag(id, { color });
      refresh();
    },
    [refresh]
  );

  const PRESET_COLORS = [
    "#8B5CF6",
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#EC4899",
    "#06B6D4",
    "#6366F1",
  ];

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-neutral-900">
          {mode === "assign" ? "Tags" : "Manage Tags"}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Create new tag */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <TagIcon className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="New tag..."
            className="h-8 w-full rounded-md border border-neutral-200 pl-8 pr-3 text-xs outline-none placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={!newTagName.trim()}
          className="flex h-8 items-center gap-1 rounded-md bg-neutral-900 px-3 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {/* Tag list */}
      <div className="space-y-1 max-h-64 overflow-y-auto">
        <AnimatePresence>
          {tags.map((tag) => (
            <motion.div
              key={tag.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className={`group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-neutral-50 ${
                mergeSource === tag.id ? "ring-1 ring-purple-300 bg-purple-50" : ""
              }`}
            >
              {/* Color dot / checkbox */}
              {mode === "assign" && documentId ? (
                <button
                  onClick={() => handleToggleTag(tag.id)}
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    docTagIds.has(tag.id)
                      ? "border-purple-500 bg-purple-500 text-white"
                      : "border-neutral-300"
                  }`}
                  aria-label={`Toggle tag ${tag.name}`}
                >
                  {docTagIds.has(tag.id) && <Check className="h-2.5 w-2.5" />}
                </button>
              ) : (
                <div className="relative">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full cursor-pointer"
                    style={{ backgroundColor: tag.color }}
                    onClick={() => {
                      const next =
                        PRESET_COLORS[
                          (PRESET_COLORS.indexOf(tag.color) + 1) %
                            PRESET_COLORS.length
                        ];
                      handleColorChange(tag.id, next);
                    }}
                  />
                </div>
              )}

              {editingId === tag.id ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleRename(tag.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(tag.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 bg-transparent text-xs text-neutral-800 outline-none"
                  autoFocus
                />
              ) : (
                <span className="flex-1 truncate text-xs text-neutral-700">
                  {tag.name}
                </span>
              )}

              <span className="text-[10px] text-neutral-300">{tag.count}</span>

              {mode === "manage" && (
                <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  {mergeSource && mergeSource !== tag.id ? (
                    <button
                      onClick={() => handleMerge(tag.id)}
                      className="rounded p-0.5 text-purple-400 hover:bg-purple-50 hover:text-purple-600"
                      title="Merge into this tag"
                      aria-label={`Merge into ${tag.name}`}
                    >
                      <Merge className="h-3 w-3" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(tag.id);
                          setEditName(tag.name);
                        }}
                        className="rounded p-0.5 text-neutral-300 hover:bg-neutral-100 hover:text-neutral-500"
                        aria-label={`Rename ${tag.name}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() =>
                          setMergeSource(
                            mergeSource === tag.id ? null : tag.id
                          )
                        }
                        className={`rounded p-0.5 transition-colors ${
                          mergeSource === tag.id
                            ? "bg-purple-100 text-purple-600"
                            : "text-neutral-300 hover:bg-neutral-100 hover:text-neutral-500"
                        }`}
                        title="Merge with another tag"
                        aria-label={`Start merge for ${tag.name}`}
                      >
                        <Merge className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(tag.id)}
                        className="rounded p-0.5 text-neutral-300 hover:bg-red-50 hover:text-red-400"
                        aria-label={`Delete ${tag.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {tags.length === 0 && (
          <p className="py-4 text-center text-xs text-neutral-400">
            No tags yet. Create one above.
          </p>
        )}
      </div>

      {mergeSource && (
        <div className="mt-2 rounded-md bg-purple-50 px-3 py-2 text-[11px] text-purple-600">
          Click another tag to merge into it, or{" "}
          <button
            onClick={() => setMergeSource(null)}
            className="font-medium underline"
          >
            cancel
          </button>
        </div>
      )}
    </div>
  );
}

// Inline tag badges for document headers
interface TagBadgesProps {
  documentId: string;
  onManage?: () => void;
}

export function TagBadges({ documentId, onManage }: TagBadgesProps) {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    setTags(getDocumentTags(documentId));
  }, [documentId]);

  if (tags.length === 0 && !onManage) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: `${tag.color}15`,
            color: tag.color,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: tag.color }}
          />
          {tag.name}
        </span>
      ))}
      {onManage && (
        <button
          onClick={onManage}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-neutral-300 px-2 py-0.5 text-[10px] text-neutral-400 transition-colors hover:border-neutral-400 hover:text-neutral-600"
        >
          <Plus className="h-2.5 w-2.5" />
          Tag
        </button>
      )}
    </div>
  );
}
