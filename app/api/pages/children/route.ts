import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getChildPages } from "@/lib/supabase/queries";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parentId = req.nextUrl.searchParams.get("parentId");
    if (!parentId) {
      return NextResponse.json(
        { error: "parentId query parameter is required" },
        { status: 400 },
      );
    }

    const children = await getChildPages(parentId);
    return NextResponse.json({ children });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch children";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
