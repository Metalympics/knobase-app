import { listDocuments, getDocument } from "@/lib/documents/store";
import type { DocumentMeta } from "@/lib/documents/types";

const RECENT_KEY = "knobase-app:recent-searches";
const MAX_RECENT = 10;

export interface SearchResult {
  document: DocumentMeta;
  matchType: "title" | "content";
  snippet: string;
  score: number;
}

function fuzzyMatch(text: string, query: string): { match: boolean; score: number } {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  if (lowerText === lowerQuery) return { match: true, score: 100 };
  if (lowerText.includes(lowerQuery)) return { match: true, score: 80 };
  if (lowerText.startsWith(lowerQuery)) return { match: true, score: 90 };

  let qi = 0;
  let score = 0;
  let consecutive = 0;
  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) {
      qi++;
      consecutive++;
      score += consecutive * 2;
    } else {
      consecutive = 0;
    }
  }

  if (qi === lowerQuery.length) {
    return { match: true, score: Math.min(score, 60) };
  }
  return { match: false, score: 0 };
}

function extractSnippet(content: string, query: string, maxLen = 120): string {
  const lower = content.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return content.slice(0, maxLen) + (content.length > maxLen ? "..." : "");

  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + query.length + 80);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < content.length ? "..." : "";
  return prefix + content.slice(start, end).replace(/\n/g, " ") + suffix;
}

export function search(query: string): SearchResult[] {
  if (!query.trim()) return [];

  const docs = listDocuments();
  const results: SearchResult[] = [];

  for (const meta of docs) {
    const titleMatch = fuzzyMatch(meta.title || "Untitled", query);
    if (titleMatch.match) {
      results.push({
        document: meta,
        matchType: "title",
        snippet: meta.title || "Untitled",
        score: titleMatch.score + 20,
      });
      continue;
    }

    const doc = getDocument(meta.id);
    if (!doc) continue;

    const contentMatch = fuzzyMatch(doc.content, query);
    if (contentMatch.match) {
      results.push({
        document: meta,
        matchType: "content",
        snippet: extractSnippet(doc.content, query),
        score: contentMatch.score,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  const recent = getRecentSearches().filter((s) => s !== query);
  recent.unshift(query);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export function clearRecentSearches(): void {
  localStorage.removeItem(RECENT_KEY);
}
