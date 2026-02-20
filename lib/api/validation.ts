import { z } from "zod";
import { apiError } from "./middleware";

// --- Document schemas ---

export const listDocumentsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(),
  tags: z.string().optional(),
  collection: z.string().uuid().optional(),
});

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(500).default("Untitled"),
  content: z.string().max(500_000).default(""),
  tags: z.array(z.string()).max(50).optional(),
  parentId: z.string().uuid().optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().max(500_000).optional(),
  tags: z.array(z.string()).max(50).optional(),
});

// --- Search schemas ---

export const searchSchema = z.object({
  query: z.string().min(1).max(200),
  filters: z
    .object({
      tags: z.array(z.string()).optional(),
      author: z.string().optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

// --- Collection schemas ---

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).default(""),
  icon: z.string().max(10).default("📁"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6B7280"),
  parentId: z.string().uuid().optional(),
  documentIds: z.array(z.string().uuid()).optional(),
});

// --- Agent schemas ---

export const invokeAgentSchema = z.object({
  agentId: z.string().optional(),
  action: z.enum(["read", "write", "chat", "summarize"]),
  documentId: z.string().uuid().optional(),
  content: z.string().max(100_000).optional(),
  context: z.string().max(100_000).optional(),
});

// --- Webhook schemas ---

export const webhookEventTypes = [
  "document.created",
  "document.updated",
  "document.deleted",
  "agent.suggested",
  "comment.added",
] as const;

export type WebhookEventType = (typeof webhookEventTypes)[number];

export const createWebhookSchema = z.object({
  url: z.string().url().max(2048),
  events: z.array(z.enum(webhookEventTypes)).min(1),
  secret: z.string().min(16).max(256).optional(),
  active: z.boolean().default(true),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().max(2048).optional(),
  events: z.array(z.enum(webhookEventTypes)).min(1).optional(),
  secret: z.string().min(16).max(256).optional(),
  active: z.boolean().optional(),
});

// --- Sanitization ---

export function sanitize(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === "string") {
      (result as Record<string, unknown>)[key] = sanitize(val);
    }
  }
  return result;
}

// --- Error formatting ---

export function formatZodError(error: z.ZodError) {
  return apiError(
    "Validation failed",
    "VALIDATION_ERROR",
    400,
    error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }))
  );
}

export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: ReturnType<typeof apiError> } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return { success: false, error: formatZodError(result.error) };
  }
  return { success: true, data: result.data };
}

export function validateQuery<T>(schema: z.ZodSchema<T>, params: URLSearchParams): { success: true; data: T } | { success: false; error: ReturnType<typeof apiError> } {
  const obj: Record<string, string> = {};
  params.forEach((value, key) => {
    obj[key] = value;
  });
  return validateBody(schema, obj);
}
