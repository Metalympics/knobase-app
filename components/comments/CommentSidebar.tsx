"use client";

import { useState, useCallback } from "react";
import { MessageSquare, Plus, Filter } from "lucide-react";
import type { Comment } from "@/lib/documents/types";
import {
  getComments,
  addComment,
  addReply,
  resolveComment,
  deleteComment,
} from "@/lib/comments/store";
import { CommentThread } from "./CommentThread";

interface CommentSidebarProps {
  documentId: string;
  onClose: () => void;
}

export function CommentSidebar({ documentId, onClose }: CommentSidebarProps) {
  const [comments, setComments] = useState(() => getComments(documentId));
  const [newComment, setNewComment] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  const refresh = useCallback(() => {
    setComments(getComments(documentId));
  }, [documentId]);

  const handleAdd = useCallback(() => {
    if (!newComment.trim()) return;
    addComment(documentId, "document", newComment.trim());
    setNewComment("");
    refresh();
  }, [documentId, newComment, refresh]);

  const handleReply = useCallback(
    (commentId: string, text: string) => {
      addReply(documentId, commentId, text);
      refresh();
    },
    [documentId, refresh]
  );

  const handleResolve = useCallback(
    (commentId: string) => {
      resolveComment(documentId, commentId);
      refresh();
    },
    [documentId, refresh]
  );

  const handleDelete = useCallback(
    (commentId: string) => {
      deleteComment(documentId, commentId);
      refresh();
    },
    [documentId, refresh]
  );

  const filtered = showResolved
    ? comments
    : comments.filter((c) => !c.resolved);

  const openCount = comments.filter((c) => !c.resolved).length;
  const resolvedCount = comments.filter((c) => c.resolved).length;

  return (
    <div className="flex h-full w-72 flex-col border-l border-[#e5e5e5] bg-white">
      <div className="flex items-center justify-between border-b border-[#e5e5e5] px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-neutral-400" />
          <h3 className="text-sm font-semibold text-neutral-900">Comments</h3>
          {openCount > 0 && (
            <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
              {openCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowResolved(!showResolved)}
          className={`rounded p-1 text-xs transition-colors ${
            showResolved ? "bg-neutral-100 text-neutral-700" : "text-neutral-400 hover:bg-neutral-100"
          }`}
          title={showResolved ? "Hide resolved" : "Show resolved"}
        >
          <Filter className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400">
            {comments.length === 0
              ? "No comments yet"
              : "All comments resolved"}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                onReply={handleReply}
                onResolve={handleResolve}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-[#e5e5e5] p-3">
        <div className="flex gap-1.5">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment... (@ to mention)"
            className="flex-1 rounded-md border border-[#e5e5e5] px-2.5 py-1.5 text-xs outline-none focus:border-neutral-400"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newComment.trim()}
            className="rounded-md bg-neutral-900 px-2.5 py-1.5 text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        {resolvedCount > 0 && (
          <div className="mt-2 text-center text-[10px] text-neutral-400">
            {resolvedCount} resolved comment{resolvedCount > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
