import type { Document, DocumentMeta } from "./types";

const LS_PREFIX = "knobase-app:";
const DOCS_KEY = `${LS_PREFIX}documents`;

function readAll(): Document[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(docs: Document[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
}

export function listDocuments(): DocumentMeta[] {
  return readAll()
    .sort((a, b) => {
      if (a.parentId === b.parentId) {
        return (a.position ?? 0) - (b.position ?? 0);
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    })
    .map(({ id, title, createdAt, updatedAt, tags, parentId, icon, position }) => ({
      id,
      title,
      createdAt,
      updatedAt,
      ...(tags ? { tags } : {}),
      ...(parentId ? { parentId } : {}),
      ...(icon ? { icon } : {}),
      position: position ?? 0,
    }));
}

export function getDocument(id: string): Document | null {
  return readAll().find((d) => d.id === id) ?? null;
}

export function createDocument(title = "Untitled", parentId?: string): Document {
  const now = new Date().toISOString();
  const docs = readAll();
  const siblings = docs.filter((d) => (d.parentId ?? undefined) === parentId);
  const maxPos = siblings.reduce((max, d) => Math.max(max, d.position ?? 0), -1);
  const doc: Document = {
    id: crypto.randomUUID(),
    title,
    content: "",
    createdAt: now,
    updatedAt: now,
    position: maxPos + 1,
    ...(parentId ? { parentId } : {}),
  };
  docs.push(doc);
  writeAll(docs);
  return doc;
}

export function updateDocument(id: string, patch: Partial<Pick<Document, "title" | "content" | "icon" | "contentJson">>): Document | null {
  const docs = readAll();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  const doc = docs[idx];
  if (patch.title !== undefined) doc.title = patch.title;
  if (patch.content !== undefined) doc.content = patch.content;
  if (patch.icon !== undefined) doc.icon = patch.icon;
  if (patch.contentJson !== undefined) doc.contentJson = patch.contentJson;
  doc.updatedAt = new Date().toISOString();
  writeAll(docs);
  return doc;
}

export function deleteDocument(id: string): boolean {
  const docs = readAll();
  const idsToRemove = new Set<string>();

  function collectDescendants(parentId: string) {
    idsToRemove.add(parentId);
    for (const d of docs) {
      if (d.parentId === parentId && !idsToRemove.has(d.id)) {
        collectDescendants(d.id);
      }
    }
  }
  collectDescendants(id);

  const filtered = docs.filter((d) => !idsToRemove.has(d.id));
  if (filtered.length === docs.length) return false;
  writeAll(filtered);
  return true;
}

export function moveDocument(id: string, newParentId: string | null): Document | null {
  const docs = readAll();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return null;

  // Prevent moving a page into its own descendant
  if (newParentId) {
    let cursor: string | undefined = newParentId;
    while (cursor) {
      if (cursor === id) return null;
      const parent = docs.find((d) => d.id === cursor);
      cursor = parent?.parentId;
    }
  }

  const doc = docs[idx];
  const siblings = docs.filter(
    (d) => (d.parentId ?? null) === (newParentId ?? null) && d.id !== id,
  );
  const maxPos = siblings.reduce((max, d) => Math.max(max, d.position ?? 0), -1);

  doc.parentId = newParentId ?? undefined;
  doc.position = maxPos + 1;
  doc.updatedAt = new Date().toISOString();
  writeAll(docs);
  return doc;
}

/**
 * Upsert a document from remote (Supabase) data into localStorage.
 * If it already exists locally and the local version is newer, the
 * local version wins (unless `force` is true). Returns the final doc.
 */
export function upsertDocumentFromRemote(
  remote: {
    id: string;
    title: string;
    content: string;
    icon?: string | null;
    parentId?: string | null;
    createdAt: string;
    updatedAt: string;
  },
  force = false,
): Document {
  const docs = readAll();
  const idx = docs.findIndex((d) => d.id === remote.id);

  if (idx === -1) {
    const doc: Document = {
      id: remote.id,
      title: remote.title,
      content: remote.content,
      icon: remote.icon,
      createdAt: remote.createdAt,
      updatedAt: remote.updatedAt,
      parentId: remote.parentId ?? undefined,
      position: 0,
    };
    docs.push(doc);
    writeAll(docs);
    return doc;
  }

  const local = docs[idx];
  if (!force && local.updatedAt >= remote.updatedAt) {
    return local;
  }

  local.title = remote.title;
  local.content = remote.content;
  if (remote.icon !== undefined) local.icon = remote.icon;
  local.updatedAt = remote.updatedAt;
  if (remote.parentId !== undefined) local.parentId = remote.parentId ?? undefined;
  writeAll(docs);
  return local;
}

/**
 * Remove a document from localStorage by ID (used when a remote delete is detected).
 */
export function removeDocumentById(id: string): void {
  const docs = readAll();
  const filtered = docs.filter((d) => d.id !== id);
  if (filtered.length !== docs.length) {
    writeAll(filtered);
  }
}

export function getChildren(parentId: string): DocumentMeta[] {
  return readAll()
    .filter((d) => d.parentId === parentId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(({ id, title, createdAt, updatedAt, parentId: pid, icon, position }) => ({
      id,
      title,
      createdAt,
      updatedAt,
      parentId: pid,
      icon,
      position: position ?? 0,
    }));
}

export function getAncestors(docId: string): DocumentMeta[] {
  const docs = readAll();
  const chain: DocumentMeta[] = [];
  let current = docs.find((d) => d.id === docId);
  while (current?.parentId) {
    const parent = docs.find((d) => d.id === current!.parentId);
    if (!parent) break;
    chain.unshift({
      id: parent.id,
      title: parent.title,
      createdAt: parent.createdAt,
      updatedAt: parent.updatedAt,
      parentId: parent.parentId,
      icon: parent.icon,
      position: parent.position ?? 0,
    });
    current = parent;
  }
  return chain;
}
