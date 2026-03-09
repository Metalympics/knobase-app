// API route for document export

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { exportDocument } from "@/lib/export/service";

const ExportRequestSchema = z.object({
  documentId: z.string().uuid(),
  format: z.enum(["png", "jpeg", "pdf"]),
  scope: z.enum(["full", "section", "selection"]),
  sectionId: z.string().optional(),
  selectionStart: z.number().optional(),
  selectionEnd: z.number().optional(),
  includeLogo: z.boolean().default(true),
  includeAuthor: z.boolean().default(true),
  includeTimestamp: z.boolean().default(true),
  quality: z.number().min(1).max(100).default(90),
  scale: z.number().min(1).max(3).default(2),
});

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const validated = ExportRequestSchema.parse(body);

    // Authenticate user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
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
        { success: false, error: "User profile not found" },
        { status: 404 }
      );
    }

    // Verify document access
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .select("id, school_id")
      .eq("id", validated.documentId)
      .eq("school_id", publicUser.school_id)
      .single();

    if (docError || !doc) {
      return NextResponse.json(
        { success: false, error: "Document not found or access denied" },
        { status: 404 }
      );
    }

    // Export document
    const result = await exportDocument({
      ...validated,
      userId: publicUser.id,
      schoolId: publicUser.school_id,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Export API error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Export failed",
      },
      { status: 500 }
    );
  }
}
