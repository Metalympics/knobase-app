export interface Tag {
  id: string;
  name: string;
  color: string;
  count: number;
}

const LS_KEY = "knobase-app:tags";
const DOC_TAGS_PREFIX = "knobase-app:doc-tags:";

function readAll(): Tag[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(tags: Tag[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(tags));
}

export function listTags(): Tag[] {
  return readAll().sort((a, b) => b.count - a.count);
}

export function getTag(id: string): Tag | null {
  return readAll().find((t) => t.id === id) ?? null;
}

export function getTagByName(name: string): Tag | null {
  return (
    readAll().find((t) => t.name.toLowerCase() === name.toLowerCase()) ?? null
  );
}

const TAG_COLORS = [
  "#8B5CF6",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
  "#6366F1",
  "#14B8A6",
  "#F97316",
];

export function createTag(name: string, color?: string): Tag {
  const existing = getTagByName(name);
  if (existing) return existing;

  const all = readAll();
  const tag: Tag = {
    id: crypto.randomUUID(),
    name: name.trim(),
    color: color ?? TAG_COLORS[all.length % TAG_COLORS.length],
    count: 0,
  };
  all.push(tag);
  writeAll(all);
  return tag;
}

export function updateTag(
  id: string,
  patch: Partial<Pick<Tag, "name" | "color">>,
): Tag | null {
  const all = readAll();
  const idx = all.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  if (patch.name !== undefined) all[idx].name = patch.name.trim();
  if (patch.color !== undefined) all[idx].color = patch.color;
  writeAll(all);
  return all[idx];
}

export function deleteTag(id: string): boolean {
  const all = readAll();
  const filtered = all.filter((t) => t.id !== id);
  if (filtered.length === all.length) return false;
  writeAll(filtered);
  return true;
}

export function mergeTags(sourceId: string, targetId: string): boolean {
  const all = readAll();
  const source = all.find((t) => t.id === sourceId);
  const target = all.find((t) => t.id === targetId);
  if (!source || !target) return false;

  target.count += source.count;
  writeAll(all.filter((t) => t.id !== sourceId));
  return true;
}

// Document-tag relationships

export function getDocumentTags(documentId: string): Tag[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${DOC_TAGS_PREFIX}${documentId}`);
    const tagIds: string[] = raw ? JSON.parse(raw) : [];
    const allTags = readAll();
    return tagIds
      .map((id) => allTags.find((t) => t.id === id))
      .filter((t): t is Tag => !!t);
  } catch {
    return [];
  }
}

export function addTagToDocument(documentId: string, tagId: string): void {
  if (typeof window === "undefined") return;
  const key = `${DOC_TAGS_PREFIX}${documentId}`;
  const tagIds: string[] = (() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();
  if (tagIds.includes(tagId)) return;
  tagIds.push(tagId);
  localStorage.setItem(key, JSON.stringify(tagIds));

  const all = readAll();
  const tag = all.find((t) => t.id === tagId);
  if (tag) {
    tag.count++;
    writeAll(all);
  }
}

export function removeTagFromDocument(documentId: string, tagId: string): void {
  if (typeof window === "undefined") return;
  const key = `${DOC_TAGS_PREFIX}${documentId}`;
  const tagIds: string[] = (() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();
  const filtered = tagIds.filter((id) => id !== tagId);
  localStorage.setItem(key, JSON.stringify(filtered));

  const all = readAll();
  const tag = all.find((t) => t.id === tagId);
  if (tag && tag.count > 0) {
    tag.count--;
    writeAll(all);
  }
}

export function bulkApplyTag(tagId: string, documentIds: string[]): void {
  documentIds.forEach((docId) => addTagToDocument(docId, tagId));
}

export function getDocumentsWithTag(tagId: string): string[] {
  if (typeof window === "undefined") return [];
  const result: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(DOC_TAGS_PREFIX)) continue;
    try {
      const tagIds: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (tagIds.includes(tagId)) {
        result.push(key.replace(DOC_TAGS_PREFIX, ""));
      }
    } catch {
      // skip
    }
  }
  return result;
}
