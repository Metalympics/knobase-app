import { NextRequest } from "next/server";
import { withAuth, apiJson, apiError } from "@/lib/api/auth";
import { listServerDocuments, createServerDocument } from "@/lib/api/server-store";
import { listDocumentsSchema, createDocumentSchema, validateBody, validateQuery } from "@/lib/api/validation";

export async function GET(request: NextRequest) {
  const auth = withAuth(request);
  if (!auth.ok) return auth.response;

  const params = request.nextUrl.searchParams;
  const validation = validateQuery(listDocumentsSchema, params);
  if (!validation.success) return validation.error;

  const { limit, offset, search, tags, collection } = validation.data;
  let docs = listServerDocuments();

  if (search) {
    const q = search.toLowerCase();
    docs = docs.filter(
      (d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)
    );
  }

  if (tags) {
    const tagList = tags.split(",").map((t) => t.trim().toLowerCase());
    docs = docs.filter((d) => d.tags?.some((t) => tagList.includes(t.toLowerCase())));
  }

  if (collection) {
    // Filter would require cross-referencing collections store - simplified here
    docs = docs.filter((d) => d.parentId === collection);
  }

  const total = docs.length;
  const paged = docs.slice(offset, offset + limit);

  return apiJson({
    data: paged.map(({ content, ...meta }) => ({ ...meta, contentLength: content.length })),
    pagination: { total, limit, offset, hasMore: offset + limit < total },
  });
}

export async function POST(request: NextRequest) {
  const auth = withAuth(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "INVALID_BODY", 400);
  }

  const validation = validateBody(createDocumentSchema, body);
  if (!validation.success) return validation.error;

  const { title, content, tags, parentId } = validation.data;
  const doc = createServerDocument({
    title,
    content,
    tags,
    parentId,
    wordCount: content.split(/\s+/).filter(Boolean).length,
  });

  return apiJson({ data: doc }, 201);
}
