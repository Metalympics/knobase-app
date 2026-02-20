import { NextRequest } from "next/server";
import { withAuth, apiJson, apiError } from "@/lib/api/auth";
import { getServerDocument, updateServerDocument, deleteServerDocument } from "@/lib/api/server-store";
import { updateDocumentSchema, validateBody } from "@/lib/api/validation";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = withAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const doc = getServerDocument(id);
  if (!doc) return apiError("Document not found", "NOT_FOUND", 404);

  return apiJson({ data: doc });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = withAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "INVALID_BODY", 400);
  }

  const validation = validateBody(updateDocumentSchema, body);
  if (!validation.success) return validation.error;

  const updated = updateServerDocument(id, validation.data);
  if (!updated) return apiError("Document not found", "NOT_FOUND", 404);

  return apiJson({ data: updated });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = withAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const deleted = deleteServerDocument(id);
  if (!deleted) return apiError("Document not found", "NOT_FOUND", 404);

  return apiJson({ message: "Document deleted" });
}
