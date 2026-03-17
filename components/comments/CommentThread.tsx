"use client";

import { useState, useCallback } from "react";
import { Check, Reply, Trash2, Bot, AtSign } from "lucide-react";
import type { Comment } from "@/lib/documents/types";

interface CommentThreadProps {
  comment: Comment;
  isActive: boolean;
  onFocus: (commentId: string) => void;
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
  const parts = text.split(/(@[\w.-]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span
          key={i}
          className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1 py-0.5 text-blue-600 font-medium"
        >
          <AtSign className="h-2.5 w-2.5" />
          {part.slice(1)}
        </span>
      );
    }
    return part;
  });
}

export function CommentThread({
  comment,
  isActive,
  onFocus,
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

  const hasMentions = comment.mentions && comment.mentions.length > 0;
  const agentMentions =
    comment.mentions?.filter((m) => m.type === "agent") ?? [];

  return (
    <div
      onClick={() => onFocus(comment.id)}
      className={`cursor-pointer rounded-lg border p-3 transition-all ${
        comment.resolved
          ? "border-green-200 bg-green-50/50 opacity-60"
          : isActive
            ? "border-blue-300 bg-blue-50/30 shadow-sm ring-1 ring-blue-200"
            : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-600">
            {comment.author.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="text-xs font-medium text-neutral-900">
              {comment.author}
            </span>
            <span className="ml-2 text-[10px] text-neutral-400">
              {formatTime(comment.timestamp)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onResolve(comment.id);
            }}
            className={`rounded p-1 transition-colors ${
              comment.resolved
                ? "text-green-500 hover:bg-green-100"
                : "text-neutral-300 hover:bg-neutral-100 hover:text-green-500"
            }`}
            title={comment.resolved ? "Unresolve" : "Resolve"}
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(comment.id);
            }}
            className="rounded p-1 text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-400"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Quoted text */}
      {comment.selectedText && (
        <div className="mt-2 rounded-md border-l-2 border-amber-300 bg-amber-50/50 px-2.5 py-1.5">
          <p className="line-clamp-2 text-[11px] italic leading-relaxed text-neutral-500">
            &ldquo;{comment.selectedText}&rdquo;
          </p>
        </div>
      )}

      {/* Comment text */}
      <div className="mt-2 text-[13px] leading-relaxed text-neutral-700">
        {highlightMentions(comment.text)}
      </div>

      {/* Agent mention badges */}
      {agentMentions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {agentMentions.map((m, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600"
            >
              <Bot className="h-2.5 w-2.5" />
              {m.name} notified
            </span>
          ))}
        </div>
      )}

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="mt-3 space-y-2 border-l-2 border-neutral-100 pl-3">
          {comment.replies.map((reply) => (
            <div key={reply.id}>
              <div className="flex items-center gap-2">
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-200 text-[8px] font-bold text-neutral-600">
                  {reply.author.charAt(0).toUpperCase()}
                </div>
                <span className="text-[11px] font-medium text-neutral-900">
                  {reply.author}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {formatTime(reply.timestamp)}
                </span>
              </div>
              <div className="mt-0.5 text-xs leading-relaxed text-neutral-600">
                {highlightMentions(reply.text)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply action */}
      {!comment.resolved && (
        <div className="mt-2">
          {isReplying ? (
            <div
              className="flex gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply... (@ to mention)"
                className="flex-1 rounded-md border border-neutral-200 px-2.5 py-1.5 text-xs outline-none transition-colors focus:border-blue-300"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleReply();
                  if (e.key === "Escape") setIsReplying(false);
                }}
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim()}
                className="rounded-md bg-neutral-900 px-2.5 py-1.5 text-[10px] font-medium text-white disabled:opacity-40"
              >
                Send
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsReplying(true);
              }}
              className="flex items-center gap-1 text-[10px] text-neutral-400 transition-colors hover:text-neutral-600"
            >
              <Reply className="h-2.5 w-2.5" /> Reply
            </button>
          )}
        </div>
      )}
    </div>
  );
}
