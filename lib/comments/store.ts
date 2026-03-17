/**
 * Comments store — Supabase-backed with localStorage write-through cache.
 *
 * - All mutations write to Supabase (primary) + localStorage (cache).
 * - `getComments` reads from Supabase; falls back to localStorage on error.
 * - `subscribeToComments` opens a Realtime channel so cross-user edits
 *   push into the local cache automatically.
 */

import { createClient } from "@/lib/supabase/client";
import type { Comment, CommentMention } from "@/lib/documents/types";

const LS_PREFIX = "knobase-app:comments:";

// ── Local cache helpers ───────────────────────────────────────────────

function readCache(documentId: string): Comment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${documentId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeCache(documentId: string, comments: Comment[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${LS_PREFIX}${documentId}`, JSON.stringify(comments));
}

// ── DB row ↔ Comment conversion ──────────────────────────────────────

interface DbRow {
  id: string;
  document_id: string;
  school_id: string;
  parent_id: string | null;
  block_id: string | null;
  content: string;
  author_id: string | null;
  author_name: string;
  selection_from: number | null;
  selection_to: number | null;
  selected_text: string | null;
  resolved: boolean;
  mentions: CommentMention[];
  created_at: string;
}

function rowToComment(row: DbRow, replies: Comment[] = []): Comment {
  return {
    id: row.id,
    blockId: row.block_id ?? "selection",
    text: row.content,
    author: row.author_name,
    timestamp: row.created_at,
    replies,
    resolved: row.resolved,
    selectionFrom: row.selection_from ?? undefined,
    selectionTo: row.selection_to ?? undefined,
    selectedText: row.selected_text ?? undefined,
    mentions: row.mentions ?? [],
  };
}

/** Assemble flat DB rows into nested Comment tree (one level of replies). */
function buildTree(rows: DbRow[]): Comment[] {
  const roots = rows.filter((r) => r.parent_id === null);
  return roots.map((r) => {
    const replies = rows
      .filter((c) => c.parent_id === r.id)
      .map((c) => rowToComment(c, []));
    return rowToComment(r, replies);
  });
}

// ── Public API ────────────────────────────────────────────────────────

/** Fetch all comments for a document. Falls back to localStorage on error. */
export async function getComments(documentId: string): Promise<Comment[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("page_comments")
      .select("id, document_id, school_id, parent_id, block_id, content, author_id, author_name, selection_from, selection_to, selected_text, resolved, mentions, created_at")
      .eq("document_id", documentId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    const comments = buildTree((data ?? []) as DbRow[]);
    writeCache(documentId, comments);
    return comments;
  } catch {
    return readCache(documentId);
  }
}

export async function addComment(
  documentId: string,
  schoolId: string,
  blockId: string,
  text: string,
  author: string = "You",
  authorId?: string,
  selection?: { from: number; to: number; selectedText: string },
): Promise<Comment> {
  const mentions = extractMentions(text);
  const supabase = createClient();

  const { data, error } = await supabase
    .from("page_comments")
    .insert({
      document_id: documentId,
      school_id: schoolId,
      block_id: blockId,
      content: text,
      author_id: authorId ?? null,
      author_name: author,
      selection_from: selection?.from ?? null,
      selection_to: selection?.to ?? null,
      selected_text: selection?.selectedText ?? null,
      mentions,
    } as never)
    .select("id, document_id, school_id, parent_id, block_id, content, author_id, author_name, selection_from, selection_to, selected_text, resolved, mentions, created_at")
    .single();

  if (error || !data) {
    // Optimistic fallback
    const fallback: Comment = {
      id: crypto.randomUUID(),
      blockId,
      text,
      author,
      timestamp: new Date().toISOString(),
      replies: [],
      selectionFrom: selection?.from,
      selectionTo: selection?.to,
      selectedText: selection?.selectedText,
      mentions,
    };
    const cached = readCache(documentId);
    cached.push(fallback);
    writeCache(documentId, cached);
    return fallback;
  }

  const comment = rowToComment(data as DbRow);
  // Update cache
  const cached = readCache(documentId);
  cached.push(comment);
  writeCache(documentId, cached);
  return comment;
}

export async function addReply(
  documentId: string,
  schoolId: string,
  parentId: string,
  text: string,
  author: string = "You",
  authorId?: string,
): Promise<Comment | null> {
  const mentions = extractMentions(text);
  const supabase = createClient();

  const { data, error } = await supabase
    .from("page_comments")
    .insert(
      {
        document_id: documentId,
        school_id: schoolId,
        parent_id: parentId,
        block_id: "reply",
        content: text,
        author_id: authorId ?? null,
        author_name: author,
        mentions,
      } as any,
    )
    .select("id, document_id, school_id, parent_id, block_id, content, author_id, author_name, selection_from, selection_to, selected_text, resolved, mentions, created_at")
    .single();

  if (error || !data) return null;

  const reply = rowToComment(data as DbRow);

  // Update cache: find parent and push reply
  const cached = readCache(documentId);
  const parent = cached.find((c) => c.id === parentId);
  if (parent) {
    parent.replies.push(reply);
    writeCache(documentId, cached);
  }
  return reply;
}

export async function resolveComment(
  documentId: string,
  commentId: string,
): Promise<void> {
  // Optimistic cache update first
  const cached = readCache(documentId);
  const comment = cached.find((c) => c.id === commentId);
  const newResolved = comment ? !comment.resolved : true;
  if (comment) {
    comment.resolved = newResolved;
    writeCache(documentId, cached);
  }

  const supabase = createClient();
  await (supabase.from("page_comments") as any)
    .update({ resolved: newResolved })
    .eq("id", commentId);
}

export async function deleteComment(
  documentId: string,
  commentId: string,
): Promise<void> {
  // Optimistic cache update
  const cached = readCache(documentId).filter((c) => c.id !== commentId);
  writeCache(documentId, cached);

  const supabase = createClient();
  await supabase.from("page_comments").delete().eq("id", commentId);
}

export async function getCommentCount(documentId: string): Promise<number> {
  const comments = await getComments(documentId);
  return comments.filter((c) => !c.resolved).length;
}

export function getCommentById(
  documentId: string,
  commentId: string,
): Comment | null {
  return readCache(documentId).find((c) => c.id === commentId) ?? null;
}

export function getCommentsForRange(
  documentId: string,
  from: number,
  to: number,
): Comment[] {
  return readCache(documentId).filter((c) => {
    if (c.selectionFrom == null || c.selectionTo == null) return false;
    return c.selectionFrom < to && c.selectionTo > from;
  });
}

/**
 * Subscribe to Realtime changes for a document's comments.
 * Call the returned cleanup function on unmount.
 */
export function subscribeToComments(
  documentId: string,
  onChange: (comments: Comment[]) => void,
): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel(`page_comments:${documentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "page_comments",
        filter: `document_id=eq.${documentId}`,
      },
      () => {
        // Re-fetch full tree on any change
        getComments(documentId).then(onChange);
      },
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ── Mention helpers ───────────────────────────────────────────────────

export function extractMentions(text: string): CommentMention[] {
  const re = /@(\w[\w.-]*)/g;
  const mentions: CommentMention[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    mentions.push({ name: match[1], type: "user" });
  }
  return mentions;
}

export function parseMentions(text: string): string[] {
  const re = /@(\w+)/g;
  const mentions: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}
