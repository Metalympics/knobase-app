// MCP tool endpoint for document export

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exportDocument } from "@/lib/export/service";
import { findApiKeyByRawToken } from "@/lib/supabase/api-keys";
import { addCorsHeaders, handlePreflight } from "@/lib/api/cors";

const MCPExportSchema = z.object({
  documentId: z.string().uuid(),
  format: z.enum(["png", "jpeg", "pdf"]).default("pdf"),
  scope: z.enum(["full", "section", "selection"]).default("full"),
  sectionId: z.string().optional(),
  selectionStart: z.number().optional(),
  selectionEnd: z.number().optional(),
  options: z
    .object({
      includeLogo: z.boolean().default(true),
      includeAuthor: z.boolean().default(true),
      includeTimestamp: z.boolean().default(true),
      quality: z.number().min(1).max(100).default(90),
      scale: z.number().min(1).max(3).default(2),
    })
    .optional(),
});

function json(request: NextRequest, data: unknown, status = 200) {
  return addCorsHeaders(request, NextResponse.json(data, { status }));
}

export async function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}

/**
 * Resolve agent identity from X-API-Key or Authorization: Bearer kb_...
 */
async function resolveAgentAuth(
  request: NextRequest,
): Promise<{ userId: string; schoolId: string } | null> {
  // X-API-Key header
  const apiKeyHeader = request.headers.get("x-api-key");
  if (apiKeyHeader) {
    const agentKey = await findApiKeyByRawToken(apiKeyHeader);
    if (!agentKey) return null;
    return { userId: agentKey.agent_id ?? "", schoolId: agentKey.school_id };
  }

  // Authorization: Bearer kb_...
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token.startsWith("kb_")) {
      const agentKey = await findApiKeyByRawToken(token);
      if (!agentKey) return null;
      return { userId: agentKey.agent_id ?? "", schoolId: agentKey.school_id };
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, format, scope, sectionId, selectionStart, selectionEnd, options } =
      MCPExportSchema.parse(body);

    let userId: string;
    let schoolId: string;

    // Try agent auth first (API key or Bearer)
    const agentAuth = await resolveAgentAuth(request);

    if (agentAuth) {
      userId = agentAuth.userId;
      schoolId = agentAuth.schoolId;
    } else {
      // Fall back to session auth
      const supabase = await createServerClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return json(request, { success: false, error: "Unauthorized - provide session or API key" }, 401);
      }

      const { data: publicUser, error: userError } = await supabase
        .from("users")
        .select("id, school_id")
        .eq("auth_id", user.id)
        .single();

      if (userError || !publicUser || !publicUser.school_id) {
        return json(request, { success: false, error: "User profile not found" }, 404);
      }

      userId = publicUser.id;
      schoolId = publicUser.school_id;
    }

    // Use admin client for document lookup (bypasses RLS for API key auth)
    const adminClient = createAdminClient();
    const { data: doc, error: docError } = await adminClient
      .from("pages")
      .select("id, school_id")
      .eq("id", documentId)
      .eq("school_id", schoolId)
      .single();

    if (docError || !doc) {
      return json(request, { success: false, error: "Document not found or access denied" }, 404);
    }

    const result = await exportDocument({
      documentId,
      format,
      scope,
      sectionId,
      selectionStart,
      selectionEnd,
      userId,
      schoolId,
      includeLogo: options?.includeLogo ?? true,
      includeAuthor: options?.includeAuthor ?? true,
      includeTimestamp: options?.includeTimestamp ?? true,
      quality: options?.quality ?? 90,
      scale: options?.scale ?? 2,
    });

    if (!result.success) {
      return json(request, result, 500);
    }

    return json(request, {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              success: true,
              url: result.url,
              fileName: result.fileName,
              fileSize: result.fileSize,
              expiresAt: result.expiresAt,
              message: `Document exported successfully as ${format.toUpperCase()}. Download URL expires in 24 hours.`,
            },
            null,
            2,
          ),
        },
      ],
    });
  } catch (error) {
    console.error("MCP export tool error:", error);

    if (error instanceof z.ZodError) {
      return json(
        request,
        {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { success: false, error: "Invalid parameters", details: error.issues },
                null,
                2,
              ),
            },
          ],
        },
        400,
      );
    }

    return json(
      request,
      {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { success: false, error: error instanceof Error ? error.message : "Export failed" },
              null,
              2,
            ),
          },
        ],
      },
      500,
    );
  }
}

// GET endpoint for tool metadata/discovery
export async function GET(request: NextRequest) {
  return json(request, {
    name: "document/export",
    description:
      "Export a document to PNG, JPEG, or PDF with branded templates",
    inputSchema: {
      type: "object",
      properties: {
        documentId: {
          type: "string",
          format: "uuid",
          description: "UUID of the document to export",
        },
        format: {
          type: "string",
          enum: ["png", "jpeg", "pdf"],
          default: "pdf",
          description: "Output format",
        },
        scope: {
          type: "string",
          enum: ["full", "section", "selection"],
          default: "full",
          description: "Export scope",
        },
        sectionId: {
          type: "string",
          description: "Section ID when scope is 'section'",
        },
        selectionStart: {
          type: "number",
          description: "Start position when scope is 'selection'",
        },
        selectionEnd: {
          type: "number",
          description: "End position when scope is 'selection'",
        },
        options: {
          type: "object",
          properties: {
            includeLogo: { type: "boolean", default: true, description: "Include school logo in export" },
            includeAuthor: { type: "boolean", default: true, description: "Include author name in export" },
            includeTimestamp: { type: "boolean", default: true, description: "Include export timestamp" },
            quality: { type: "number", minimum: 1, maximum: 100, default: 90, description: "JPEG quality (1-100)" },
            scale: { type: "number", minimum: 1, maximum: 3, default: 2, description: "Device scale factor" },
          },
        },
      },
      required: ["documentId"],
    },
  });
}
