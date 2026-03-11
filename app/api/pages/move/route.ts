import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { movePage } from "@/lib/supabase/queries";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { pageId, newParentId } = body as {
      pageId: string;
      newParentId: string | null;
    };

    if (!pageId) {
      return NextResponse.json(
        { error: "pageId is required" },
        { status: 400 },
      );
    }

    const page = await movePage(pageId, newParentId ?? null);
    return NextResponse.json({ page });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to move page";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
