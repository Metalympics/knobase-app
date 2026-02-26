import { NextRequest } from "next/server";
import { withAuth, apiJson, apiError } from "@/lib/api/auth";
import { listServerDocuments } from "@/lib/api/server-store";
import { searchSchema, validateBody } from "@/lib/api/validation";

export async function POST(request: NextRequest) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "INVALID_BODY", 400);
  }

  const validation = validateBody(searchSchema, body);
  if (!validation.success) return validation.error;

  const { query, filters, limit, offset } = validation.data;
  const queryLower = query.toLowerCase();
  let docs = listServerDocuments();

  // Full-text search
  const scored = docs
    .map((doc) => {
      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const contentLower = doc.content.toLowerCase();

      if (titleLower === queryLower) score += 100;
      else if (titleLower.includes(queryLower)) score += 80;

      if (contentLower.includes(queryLower)) {
        score += 40;
        const occurrences = contentLower.split(queryLower).length - 1;
        score += Math.min(occurrences * 5, 30);
      }

      return { doc, score };
    })
    .filter(({ score }) => score > 0);

  // Apply filters
  let results = scored;

  if (filters?.tags?.length) {
    const tagSet = new Set(filters.tags.map((t) => t.toLowerCase()));
    results = results.filter(({ doc }) => doc.tags?.some((t) => tagSet.has(t.toLowerCase())));
  }

  if (filters?.dateFrom) {
    results = results.filter(({ doc }) => doc.createdAt >= filters.dateFrom!);
  }
  if (filters?.dateTo) {
    results = results.filter(({ doc }) => doc.createdAt <= filters.dateTo!);
  }

  results.sort((a, b) => b.score - a.score);
  const total = results.length;
  const paged = results.slice(offset, offset + limit);

  return apiJson({
    data: paged.map(({ doc, score }) => {
      const idx = doc.content.toLowerCase().indexOf(queryLower);
      const start = Math.max(0, idx - 60);
      const end = Math.min(doc.content.length, idx + query.length + 100);
      const snippet =
        idx >= 0
          ? (start > 0 ? "..." : "") + doc.content.slice(start, end).replace(/\n/g, " ") + (end < doc.content.length ? "..." : "")
          : doc.content.slice(0, 160) + (doc.content.length > 160 ? "..." : "");

      return {
        id: doc.id,
        title: doc.title,
        snippet,
        score,
        tags: doc.tags,
        updatedAt: doc.updatedAt,
      };
    }),
    pagination: { total, limit, offset, hasMore: offset + limit < total },
  });
}
