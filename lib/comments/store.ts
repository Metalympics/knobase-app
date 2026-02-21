import type { Comment } from "@/lib/documents/types";

const LS_PREFIX = "knobase-app:comments:";

export function getComments(documentId: string): Comment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${documentId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeComments(documentId: string, comments: Comment[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${LS_PREFIX}${documentId}`, JSON.stringify(comments));
}

export function addComment(
  documentId: string,
  blockId: string,
  text: string,
  author: string = "You",
): Comment {
  const comments = getComments(documentId);
  const comment: Comment = {
    id: crypto.randomUUID(),
    blockId,
    text,
    author,
    timestamp: new Date().toISOString(),
    replies: [],
  };
  comments.push(comment);
  writeComments(documentId, comments);
  return comment;
}

export function addReply(
  documentId: string,
  commentId: string,
  text: string,
  author: string = "You",
): Comment | null {
  const comments = getComments(documentId);
  const parent = comments.find((c) => c.id === commentId);
  if (!parent) return null;

  const reply: Comment = {
    id: crypto.randomUUID(),
    blockId: parent.blockId,
    text,
    author,
    timestamp: new Date().toISOString(),
    replies: [],
  };
  parent.replies.push(reply);
  writeComments(documentId, comments);
  return reply;
}

export function resolveComment(documentId: string, commentId: string): void {
  const comments = getComments(documentId);
  const comment = comments.find((c) => c.id === commentId);
  if (comment) {
    comment.resolved = !comment.resolved;
    writeComments(documentId, comments);
  }
}

export function deleteComment(documentId: string, commentId: string): void {
  const comments = getComments(documentId).filter((c) => c.id !== commentId);
  writeComments(documentId, comments);
}

export function getCommentCount(documentId: string): number {
  return getComments(documentId).filter((c) => !c.resolved).length;
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
