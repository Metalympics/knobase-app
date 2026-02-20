"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Plus,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderPlus,
} from "lucide-react";
import {
  listCollections,
  createCollection,
  deleteCollection,
  updateCollection,
  addDocumentToCollection,
  removeDocumentFromCollection,
  type Collection,
} from "@/lib/collections/store";

interface CollectionSidebarProps {
  activeDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  documents: { id: string; title: string }[];
}

const COLLECTION_COLORS = [
  "#8B5CF6",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
];

export function CollectionSidebar({
  activeDocumentId,
  onSelectDocument,
  documents,
}: CollectionSidebarProps) {
  const [collections, setCollections] = useState<Collection[]>(listCollections);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const refresh = useCallback(() => setCollections(listCollections()), []);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCreate = useCallback(() => {
    const color =
      COLLECTION_COLORS[collections.length % COLLECTION_COLORS.length];
    const col = createCollection({ name: "New Collection", color });
    refresh();
    setExpanded((prev) => new Set(prev).add(col.id));
    setEditingId(col.id);
    setEditName(col.name);
  }, [collections.length, refresh]);

  const handleRename = useCallback(
    (id: string) => {
      if (editName.trim()) {
        updateCollection(id, { name: editName.trim() });
        refresh();
      }
      setEditingId(null);
    },
    [editName, refresh]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteCollection(id);
      setMenuId(null);
      refresh();
    },
    [refresh]
  );

  const handleDrop = useCallback(
    (collectionId: string, e: React.DragEvent) => {
      e.preventDefault();
      setDragOverId(null);
      const docId = e.dataTransfer.getData("text/plain");
      if (docId) {
        addDocumentToCollection(collectionId, docId);
        refresh();
      }
    },
    [refresh]
  );

  const handleRemoveDoc = useCallback(
    (collectionId: string, docId: string) => {
      removeDocumentFromCollection(collectionId, docId);
      refresh();
    },
    [refresh]
  );

  return (
    <div className="py-2">
      <div className="flex items-center justify-between px-4 pb-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
          Collections
        </span>
        <button
          onClick={handleCreate}
          className="rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="Create collection"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-0.5 px-2">
        {collections.map((col) => {
          const isExpanded = expanded.has(col.id);
          const colDocs = documents.filter((d) =>
            col.documentIds.includes(d.id)
          );

          return (
            <div key={col.id}>
              <div
                className={`group flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors ${
                  dragOverId === col.id
                    ? "bg-purple-50 ring-1 ring-purple-200"
                    : "hover:bg-neutral-50"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverId(col.id);
                }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => handleDrop(col.id, e)}
              >
                <button
                  onClick={() => toggleExpand(col.id)}
                  className="rounded p-0.5 text-neutral-400 transition-colors hover:text-neutral-600"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  <ChevronRight
                    className={`h-3 w-3 transition-transform ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </button>

                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: col.color }}
                />

                {editingId === col.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleRename(col.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(col.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 bg-transparent px-1 text-xs text-neutral-800 outline-none"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 truncate text-xs font-medium text-neutral-700">
                    {col.icon} {col.name}
                  </span>
                )}

                <span className="text-[10px] text-neutral-300">
                  {colDocs.length}
                </span>

                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuId(menuId === col.id ? null : col.id);
                    }}
                    className="rounded p-0.5 text-neutral-300 opacity-0 transition-all hover:bg-neutral-100 hover:text-neutral-500 group-hover:opacity-100"
                    aria-label="Collection options"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </button>

                  <AnimatePresence>
                    {menuId === col.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
                      >
                        <button
                          onClick={() => {
                            setEditingId(col.id);
                            setEditName(col.name);
                            setMenuId(null);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
                        >
                          <Pencil className="h-3 w-3" />
                          Rename
                        </button>
                        <button
                          onClick={() => handleDelete(col.id)}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pl-6"
                  >
                    {colDocs.length === 0 ? (
                      <p className="py-1.5 text-[10px] text-neutral-300">
                        Drag docs here
                      </p>
                    ) : (
                      colDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="group/doc flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-neutral-50"
                        >
                          <button
                            onClick={() => onSelectDocument(doc.id)}
                            className={`flex flex-1 items-center gap-1.5 text-xs ${
                              doc.id === activeDocumentId
                                ? "font-medium text-neutral-900"
                                : "text-neutral-500"
                            }`}
                          >
                            <FileText className="h-3 w-3 shrink-0 text-neutral-300" />
                            <span className="truncate">{doc.title}</span>
                          </button>
                          <button
                            onClick={() =>
                              handleRemoveDoc(col.id, doc.id)
                            }
                            className="rounded p-0.5 text-neutral-300 opacity-0 transition-all hover:text-red-400 group-hover/doc:opacity-100"
                            aria-label="Remove from collection"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {collections.length === 0 && (
          <button
            onClick={handleCreate}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-600"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Create a collection
          </button>
        )}
      </div>
    </div>
  );
}
