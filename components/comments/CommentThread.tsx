"use client";

import { useState, useCallback } from "react";
import { Check, Reply, Trash2 } from "lucide-react";
import type { Comment } from "@/lib/documents/types";

interface CommentThreadProps {
  comment: Comment;
  onReply: (commentId: string, text: string) => void;
  onResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
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

function highlightMentions(text: string): React.ReactNode {
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-semibold text-blue-600">
        {part}
      </span>
    ) : (
      part
    )
  );
}

export function CommentThread({
  comment,
  onReply,
  onResolve,
  onDelete,
}: CommentThreadProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleReply = useCallback(() => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText.trim());
    setReplyText("");
    setIsReplying(false);
  }, [comment.id, replyText, onReply]);

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        comment.resolved
          ? "border-green-200 bg-green-50/50 opacity-60"
          : "border-[#e5e5e5] bg-white"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-600">
            {comment.author.charAt(0).toUpperCase()}
          </div>
          <span className="text-xs font-medium text-neutral-900">
            {comment.author}
          </span>
          <span className="text-[10px] text-neutral-400">
            {formatTime(comment.timestamp)}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onResolve(comment.id)}
            className={`rounded p-0.5 transition-colors ${
              comment.resolved
                ? "text-green-500 hover:bg-green-100"
                : "text-neutral-300 hover:bg-neutral-100 hover:text-green-500"
            }`}
            title={comment.resolved ? "Unresolve" : "Resolve"}
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDelete(comment.id)}
            className="rounded p-0.5 text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="mt-1.5 text-sm text-neutral-700">
        {highlightMentions(comment.text)}
      </div>

      {comment.replies.length > 0 && (
        <div className="mt-2 space-y-2 border-l-2 border-neutral-100 pl-3">
          {comment.replies.map((reply) => (
            <div key={reply.id}>
              <div className="flex items-center gap-2">
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-200 text-[9px] font-bold text-neutral-600">
                  {reply.author.charAt(0).toUpperCase()}
                </div>
                <span className="text-[11px] font-medium text-neutral-900">
                  {reply.author}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {formatTime(reply.timestamp)}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-neutral-600">
                {highlightMentions(reply.text)}
              </div>
            </div>
          ))}
        </div>
      )}

      {!comment.resolved && (
        <div className="mt-2">
          {isReplying ? (
            <div className="flex gap-1.5">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply... (use @ to mention)"
                className="flex-1 rounded border border-[#e5e5e5] px-2 py-1 text-xs outline-none focus:border-neutral-400"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleReply();
                  if (e.key === "Escape") setIsReplying(false);
                }}
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim()}
                className="rounded bg-neutral-900 px-2 py-1 text-[10px] font-medium text-white disabled:opacity-40"
              >
                Send
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsReplying(true)}
              className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-neutral-600"
            >
              <Reply className="h-2.5 w-2.5" /> Reply
            </button>
          )}
        </div>
      )}
    </div>
  );
}
