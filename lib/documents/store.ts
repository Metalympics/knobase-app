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
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(({ id, title, createdAt, updatedAt, tags, parentId }) => ({
      id,
      title,
      createdAt,
      updatedAt,
      ...(tags ? { tags } : {}),
      ...(parentId ? { parentId } : {}),
    }));
}

export function getDocument(id: string): Document | null {
  return readAll().find((d) => d.id === id) ?? null;
}

export function createDocument(title = "Untitled", parentId?: string): Document {
  const now = new Date().toISOString();
  const doc: Document = {
    id: crypto.randomUUID(),
    title,
    content: "",
    createdAt: now,
    updatedAt: now,
    ...(parentId ? { parentId } : {}),
  };
  const docs = readAll();
  docs.push(doc);
  writeAll(docs);
  return doc;
}

export function updateDocument(id: string, patch: Partial<Pick<Document, "title" | "content">>): Document | null {
  const docs = readAll();
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  const doc = docs[idx];
  if (patch.title !== undefined) doc.title = patch.title;
  if (patch.content !== undefined) doc.content = patch.content;
  doc.updatedAt = new Date().toISOString();
  writeAll(docs);
  return doc;
}

export function deleteDocument(id: string): boolean {
  const docs = readAll();
  const filtered = docs.filter((d) => d.id !== id);
  if (filtered.length === docs.length) return false;
  writeAll(filtered);
  return true;
}
