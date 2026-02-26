import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { browsePacks, createPack, generateSlug } from "@/lib/marketplace/crud";
import type { OpenclawManifest } from "@/lib/marketplace/types";

/**
 * GET /api/marketplace/packs — Browse marketplace listings
 * Query params: category, search, featured, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const result = await browsePacks({
      category: searchParams.get("category") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      featured: searchParams.get("featured") === "true" ? true : undefined,
      limit: searchParams.has("limit") ? parseInt(searchParams.get("limit")!) : undefined,
      offset: searchParams.has("offset") ? parseInt(searchParams.get("offset")!) : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[Marketplace] Browse error:", error);
    return NextResponse.json({ error: "Failed to browse packs" }, { status: 500 });
  }
}

/**
 * POST /api/marketplace/packs — Create a new listing (draft)
 * Requires auth. Body: { name, description, priceCents, categories, tags, manifest, ... }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up internal user ID
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const userId = (profile as unknown as { id: string }).id;
    const body = await request.json();

    const {
      name,
      description,
      shortDescription,
      readme,
      priceCents,
      categories,
      tags,
      manifest,
      thumbnailUrl,
      previewImages,
    } = body as {
      name: string;
      description: string;
      shortDescription?: string;
      readme?: string;
      priceCents: number;
      categories: string[];
      tags: string[];
      manifest: OpenclawManifest;
      thumbnailUrl?: string;
      previewImages?: string[];
    };

    if (!name || !description) {
      return NextResponse.json({ error: "name and description required" }, { status: 400 });
    }

    const pack = await createPack({
      slug: generateSlug(name),
      creator_id: userId,
      name,
      description,
      short_description: shortDescription ?? null,
      readme: readme ?? null,
      manifest: manifest as unknown as Record<string, unknown>,
      price_cents: priceCents ?? 0,
      categories: categories ?? [],
      tags: tags ?? [],
      thumbnail_url: thumbnailUrl ?? null,
      preview_images: previewImages ?? [],
      agent_count: manifest?.agents?.length ?? 0,
      document_count: manifest?.documents?.length ?? 0,
      workflow_count: manifest?.workflows?.length ?? 0,
    });

    return NextResponse.json({ pack }, { status: 201 });
  } catch (error) {
    console.error("[Marketplace] Create error:", error);
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
  }
}
