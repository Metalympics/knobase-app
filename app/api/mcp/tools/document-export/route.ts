// MCP tool endpoint for document export

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { exportDocument } from "@/lib/export/service";

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

/**
 * MCP Tool: document/export
 * 
 * Exports a document to PNG, JPEG, or PDF format with branded templates.
 * 
 * Parameters:
 * - documentId (required): UUID of the document to export
 * - format (optional): Output format - "png", "jpeg", or "pdf" (default: "pdf")
 * - scope (optional): Export scope - "full", "section", or "selection" (default: "full")
 * - sectionId (optional): Section ID when scope is "section"
 * - selectionStart (optional): Start position when scope is "selection"
 * - selectionEnd (optional): End position when scope is "selection"
 * - options (optional): Additional export options
 *   - includeLogo: Include school logo (default: true)
 *   - includeAuthor: Include author name (default: true)
 *   - includeTimestamp: Include export timestamp (default: true)
 *   - quality: JPEG quality 1-100 (default: 90)
 *   - scale: Device scale factor 1-3 (default: 2)
 * 
 * Returns:
 * - success: Boolean indicating success
 * - url: Signed URL to download the exported file (24h expiry)
 * - fileName: Name of the exported file
 * - fileSize: Size in bytes
 * - expiresAt: ISO timestamp when URL expires
 * - error: Error message if failed
 */
export async function POST(request: NextRequest) {
  try {
    // Parse MCP request body
    const body = await request.json();
    const { documentId, format, scope, sectionId, selectionStart, selectionEnd, options } =
      MCPExportSchema.parse(body);

    // Authenticate via API key or session
    const supabase = await createServerClient();
    const apiKey = request.headers.get("x-api-key");

    let userId: string;
    let schoolId: string;

    if (apiKey) {
      // Authenticate via API key
      const { data: keyData, error: keyError } = await supabase
        .from("agent_api_keys")
        .select("user_id, school_id")
        .eq("key_hash", apiKey)
        .eq("is_active", true)
        .single();

      if (keyError || !keyData) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid API key",
          },
          { status: 401 }
        );
      }

      userId = keyData.user_id;
      schoolId = keyData.school_id;
    } else {
      // Authenticate via session
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json(
          {
            success: false,
            error: "Unauthorized - provide session or API key",
          },
          { status: 401 }
        );
      }

      // Get user's public profile
      const { data: publicUser, error: userError } = await supabase
        .from("users")
        .select("id, school_id")
        .eq("auth_id", user.id)
        .single();

      if (userError || !publicUser || !publicUser.school_id) {
        return NextResponse.json(
          {
            success: false,
            error: "User profile not found",
          },
          { status: 404 }
        );
      }

      userId = publicUser.id;
      schoolId = publicUser.school_id;
    }

    // Verify document access
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, school_id")
      .eq("id", documentId)
      .eq("school_id", schoolId)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        {
          success: false,
          error: "Document not found or access denied",
        },
        { status: 404 }
      );
    }

    // Export document
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
      return NextResponse.json(result, { status: 500 });
    }

    // Return MCP-compatible response
    return NextResponse.json(
      {
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
              2
            ),
          },
        ],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("MCP export tool error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: "Invalid parameters",
                  details: error.issues,
                },
                null,
                2
              ),
            },
          ],
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: false,
                error: error instanceof Error ? error.message : "Export failed",
              },
              null,
              2
            ),
          },
        ],
      },
      { status: 500 }
    );
  }
}

// GET endpoint for tool metadata/discovery
export async function GET() {
  return NextResponse.json({
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
            includeLogo: {
              type: "boolean",
              default: true,
              description: "Include school logo in export",
            },
            includeAuthor: {
              type: "boolean",
              default: true,
              description: "Include author name in export",
            },
            includeTimestamp: {
              type: "boolean",
              default: true,
              description: "Include export timestamp",
            },
            quality: {
              type: "number",
              minimum: 1,
              maximum: 100,
              default: 90,
              description: "JPEG quality (1-100, ignored for PNG/PDF)",
            },
            scale: {
              type: "number",
              minimum: 1,
              maximum: 3,
              default: 2,
              description: "Device scale factor for images",
            },
          },
        },
      },
      required: ["documentId"],
    },
  });
}
