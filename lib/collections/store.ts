export interface Collection {
  id: string;
  name: string;
  description: string;
  documentIds: string[];
  icon: string;
  color: string;
  parentId?: string;
  order: number;
  createdAt: string;
}

const LS_KEY = "knobase-app:collections";

function readAll(): Collection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(collections: Collection[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(collections));
}

export function listCollections(): Collection[] {
  return readAll().sort((a, b) => a.order - b.order);
}

export function getCollection(id: string): Collection | null {
  return readAll().find((c) => c.id === id) ?? null;
}

export function createCollection(
  partial: Partial<Omit<Collection, "id" | "createdAt">>,
): Collection {
  const all = readAll();
  const collection: Collection = {
    id: crypto.randomUUID(),
    name: partial.name ?? "New Collection",
    description: partial.description ?? "",
    documentIds: partial.documentIds ?? [],
    icon: partial.icon ?? "📁",
    color: partial.color ?? "#6B7280",
    parentId: partial.parentId,
    order: partial.order ?? all.length,
    createdAt: new Date().toISOString(),
  };
  all.push(collection);
  writeAll(all);
  return collection;
}

export function updateCollection(
  id: string,
  patch: Partial<
    Pick<
      Collection,
      "name" | "description" | "icon" | "color" | "order" | "parentId"
    >
  >,
): Collection | null {
  const all = readAll();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  Object.assign(all[idx], patch);
  writeAll(all);
  return all[idx];
}

export function deleteCollection(id: string): boolean {
  const all = readAll();
  const filtered = all.filter((c) => c.id !== id);
  if (filtered.length === all.length) return false;
  writeAll(filtered);
  return true;
}

export function addDocumentToCollection(
  collectionId: string,
  documentId: string,
): boolean {
  const all = readAll();
  const col = all.find((c) => c.id === collectionId);
  if (!col) return false;
  if (col.documentIds.includes(documentId)) return true;
  col.documentIds.push(documentId);
  writeAll(all);
  return true;
}

export function removeDocumentFromCollection(
  collectionId: string,
  documentId: string,
): boolean {
  const all = readAll();
  const col = all.find((c) => c.id === collectionId);
  if (!col) return false;
  const before = col.documentIds.length;
  col.documentIds = col.documentIds.filter((id) => id !== documentId);
  if (col.documentIds.length === before) return false;
  writeAll(all);
  return true;
}

export function reorderCollections(orderedIds: string[]): void {
  const all = readAll();
  orderedIds.forEach((id, index) => {
    const col = all.find((c) => c.id === id);
    if (col) col.order = index;
  });
  writeAll(all);
}

export function getCollectionsForDocument(documentId: string): Collection[] {
  return readAll().filter((c) => c.documentIds.includes(documentId));
}
