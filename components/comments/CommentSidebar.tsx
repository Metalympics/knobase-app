"use client";

import { useState, useCallback, useEffect } from "react";
import { MessageSquare, Filter, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Comment } from "@/lib/documents/types";
import {
  getComments,
  addReply,
  resolveComment,
  deleteComment,
  subscribeToComments,
} from "@/lib/comments/store";
import { CommentThread } from "./CommentThread";

interface CommentSidebarProps {
  documentId: string;
  schoolId: string;
  isOpen: boolean;
  activeCommentId: string | null;
  onClose: () => void;
  onCommentFocus: (commentId: string) => void;
  onCommentsChange: (comments: Comment[]) => void;
  /** Caller can supply the author name + id for new replies */
  authorName?: string;
  authorId?: string;
}

export function CommentSidebar({
  documentId,
  schoolId,
  isOpen,
  activeCommentId,
  onClose,
  onCommentFocus,
  onCommentsChange,
  authorName = "You",
  authorId,
}: CommentSidebarProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [showResolved, setShowResolved] = useState(false);

  const refresh = useCallback(async () => {
    const updated = await getComments(documentId);
    setComments(updated);
    onCommentsChange(updated);
  }, [documentId, onCommentsChange]);

  // Load comments when sidebar opens or documentId changes
  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  // Supabase Realtime — push cross-user edits into local state
  useEffect(() => {
    const unsub = subscribeToComments(documentId, (updated) => {
      setComments(updated);
      onCommentsChange(updated);
    });
    return unsub;
  }, [documentId, onCommentsChange]);

  const handleReply = useCallback(
    async (commentId: string, text: string) => {
      await addReply(documentId, schoolId, commentId, text, authorName, authorId);
      await refresh();
    },
    [documentId, schoolId, authorName, authorId, refresh],
  );

  const handleResolve = useCallback(
    async (commentId: string) => {
      await resolveComment(documentId, commentId);
      await refresh();
    },
    [documentId, refresh],
  );

  const handleDelete = useCallback(
    async (commentId: string) => {
      await deleteComment(documentId, commentId);
      await refresh();
    },
    [documentId, refresh],
  );

  const filtered = showResolved
    ? comments
    : comments.filter((c) => !c.resolved);
  const openCount = comments.filter((c) => !c.resolved).length;
  const resolvedCount = comments.filter((c) => c.resolved).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className="flex h-full flex-col overflow-hidden border-l border-neutral-200 bg-white"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-neutral-400" />
              <h3 className="text-sm font-semibold text-neutral-900">
                Comments
              </h3>
              {openCount > 0 && (
                <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                  {openCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowResolved(!showResolved)}
                className={`rounded-md p-1.5 text-xs transition-colors ${
                  showResolved
                    ? "bg-neutral-100 text-neutral-700"
                    : "text-neutral-400 hover:bg-neutral-100"
                }`}
                title={showResolved ? "Hide resolved" : "Show resolved"}
              >
                <Filter className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto p-3">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="mb-2 h-8 w-8 text-neutral-200" />
                <p className="text-xs text-neutral-400">
                  {comments.length === 0
                    ? "No comments yet"
                    : "All comments resolved"}
                </p>
                <p className="mt-1 text-[10px] text-neutral-300">
                  Select text and use{" "}
                  <kbd className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[9px] text-neutral-500">
                    ⌘⇧M
                  </kbd>{" "}
                  to comment
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((comment) => (
                  <CommentThread
                    key={comment.id}
                    comment={comment}
                    isActive={activeCommentId === comment.id}
                    onFocus={onCommentFocus}
                    onReply={handleReply}
                    onResolve={handleResolve}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {resolvedCount > 0 && !showResolved && (
            <div className="shrink-0 border-t border-neutral-100 px-4 py-2">
              <button
                onClick={() => setShowResolved(true)}
                className="w-full text-center text-[10px] text-neutral-400 transition-colors hover:text-neutral-600"
              >
                Show {resolvedCount} resolved comment
                {resolvedCount > 1 ? "s" : ""}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
