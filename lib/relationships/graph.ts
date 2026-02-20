import { listDocuments, getDocument } from "@/lib/documents/store";
import type { DocumentMeta } from "@/lib/documents/types";

export interface DocLink {
  from: string;
  to: string;
  context: string;
}

export interface GraphNode {
  id: string;
  title: string;
  linkCount: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface DocumentGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const WIKILINK_REGEX = /\[\[([^\]]+)\]\]/g;

export function parseWikilinks(content: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(WIKILINK_REGEX.source, "g");
  while ((match = re.exec(content)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

export function getBacklinks(documentId: string): { doc: DocumentMeta; context: string }[] {
  const docs = listDocuments();
  const target = getDocument(documentId);
  if (!target) return [];

  const results: { doc: DocumentMeta; context: string }[] = [];

  for (const meta of docs) {
    if (meta.id === documentId) continue;
    const doc = getDocument(meta.id);
    if (!doc) continue;

    const links = parseWikilinks(doc.content);
    if (links.some((l) => l.toLowerCase() === target.title.toLowerCase())) {
      const lines = doc.content.split("\n");
      const contextLine = lines.find((line) =>
        line.toLowerCase().includes(`[[${target.title.toLowerCase()}]]`)
      );
      results.push({
        doc: meta,
        context: contextLine?.trim() ?? "",
      });
    }
  }

  return results;
}

export function getOutgoingLinks(documentId: string): { title: string; targetId: string | null }[] {
  const doc = getDocument(documentId);
  if (!doc) return [];

  const allDocs = listDocuments();
  const titles = parseWikilinks(doc.content);
  const unique = [...new Set(titles)];

  return unique.map((title) => {
    const found = allDocs.find(
      (d) => d.title.toLowerCase() === title.toLowerCase()
    );
    return { title, targetId: found?.id ?? null };
  });
}

export function buildDocumentGraph(): DocumentGraph {
  const allDocs = listDocuments();
  const linkCounts = new Map<string, number>();
  const edges: GraphEdge[] = [];

  for (const meta of allDocs) {
    const doc = getDocument(meta.id);
    if (!doc) continue;

    const links = parseWikilinks(doc.content);
    for (const linkTitle of links) {
      const target = allDocs.find(
        (d) => d.title.toLowerCase() === linkTitle.toLowerCase()
      );
      if (target && target.id !== meta.id) {
        const edgeKey = `${meta.id}->${target.id}`;
        if (!edges.some((e) => `${e.source}->${e.target}` === edgeKey)) {
          edges.push({ source: meta.id, target: target.id });
        }
        linkCounts.set(target.id, (linkCounts.get(target.id) ?? 0) + 1);
        linkCounts.set(meta.id, (linkCounts.get(meta.id) ?? 0) + 1);
      }
    }
  }

  const nodes: GraphNode[] = allDocs.map((d) => ({
    id: d.id,
    title: d.title || "Untitled",
    linkCount: linkCounts.get(d.id) ?? 0,
  }));

  return { nodes, edges };
}
