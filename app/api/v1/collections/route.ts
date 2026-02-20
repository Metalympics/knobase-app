import { NextRequest } from "next/server";
import { withAuth, apiJson, apiError } from "@/lib/api/auth";
import { listServerCollections, createServerCollection } from "@/lib/api/server-store";
import { createCollectionSchema, validateBody } from "@/lib/api/validation";

export async function GET(request: NextRequest) {
  const auth = withAuth(request);
  if (!auth.ok) return auth.response;

  const collections = listServerCollections();
  return apiJson({ data: collections });
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

  const validation = validateBody(createCollectionSchema, body);
  if (!validation.success) return validation.error;

  const { name, description, icon, color, parentId, documentIds } = validation.data;
  const collection = createServerCollection({
    name,
    description,
    documentIds: documentIds ?? [],
    icon,
    color,
    parentId,
  });

  return apiJson({ data: collection }, 201);
}
