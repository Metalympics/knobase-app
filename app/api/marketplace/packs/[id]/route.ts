import { NextRequest, NextResponse } from "next/server";
import { getPack, updatePack, deletePack, submitForReview } from "@/lib/marketplace/crud";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/marketplace/packs/[id] — Get pack detail
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pack = await getPack(id);
    if (!pack) {
      return NextResponse.json({ error: "Pack not found" }, { status: 404 });
    }
    return NextResponse.json({ pack });
  } catch (error) {
    console.error("[Marketplace] Detail error:", error);
    return NextResponse.json({ error: "Failed to get pack" }, { status: 500 });
  }
}

/**
 * PATCH /api/marketplace/packs/[id] — Update pack
 * Body: { name?, description?, priceCents?, status?, ... }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check if the action is to submit for review
    if (body.action === "submit_for_review") {
      await submitForReview(id);
      return NextResponse.json({ message: "Submitted for review" });
    }

    const pack = await updatePack(id, {
      name: body.name,
      description: body.description,
      short_description: body.shortDescription,
      readme: body.readme,
      price_cents: body.priceCents,
      categories: body.categories,
      tags: body.tags,
      manifest: body.manifest,
      thumbnail_url: body.thumbnailUrl,
      preview_images: body.previewImages,
    });

    return NextResponse.json({ pack });
  } catch (error) {
    console.error("[Marketplace] Update error:", error);
    return NextResponse.json({ error: "Failed to update pack" }, { status: 500 });
  }
}

/**
 * DELETE /api/marketplace/packs/[id] — Delete draft pack
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deletePack(id);
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("[Marketplace] Delete error:", error);
    return NextResponse.json({ error: "Failed to delete pack" }, { status: 500 });
  }
}
