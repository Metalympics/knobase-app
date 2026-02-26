// ── Marketplace CRUD ──
// Supabase operations for knowledge packs, purchases, and reviews.

import { createClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  KnowledgePack,
  KnowledgePackInsert,
  KnowledgePackUpdate,
  PackPurchase,
  PackReview,
  ImportJob,
} from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* Knowledge Packs                                                     */
/* ------------------------------------------------------------------ */

/** Browse active packs (public marketplace) */
export async function browsePacks(opts?: {
  category?: string;
  search?: string;
  featured?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ packs: KnowledgePack[]; count: number }> {
  const supabase = createClient();
  let query = supabase
    .from("knowledge_packs")
    .select("*", { count: "exact" })
    .eq("status", "active")
    .order("sales_count", { ascending: false });

  if (opts?.category) {
    query = query.contains("categories", [opts.category]);
  }
  if (opts?.featured) {
    query = query.eq("featured", true);
  }
  if (opts?.search) {
    query = query.textSearch("name", opts.search, { type: "websearch" });
  }

  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return {
    packs: (data ?? []) as unknown as KnowledgePack[],
    count: count ?? 0,
  };
}

/** Get a single pack by ID */
export async function getPack(id: string): Promise<KnowledgePack | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("knowledge_packs")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as unknown as KnowledgePack;
}

/** Get a single pack by slug */
export async function getPackBySlug(slug: string): Promise<KnowledgePack | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("knowledge_packs")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) return null;
  return data as unknown as KnowledgePack;
}

/** Create a new pack listing (draft) */
export async function createPack(input: KnowledgePackInsert): Promise<KnowledgePack> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("knowledge_packs")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as KnowledgePack;
}

/** Update a pack */
export async function updatePack(id: string, updates: KnowledgePackUpdate): Promise<KnowledgePack> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("knowledge_packs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as KnowledgePack;
}

/** Submit a pack for review */
export async function submitForReview(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("knowledge_packs")
    .update({ status: "pending_review" as const })
    .eq("id", id);
  if (error) throw error;
}

/** List packs by creator (for dashboard) */
export async function listPacksByCreator(creatorId: string): Promise<KnowledgePack[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("knowledge_packs")
    .select("*")
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as KnowledgePack[];
}

/** Delete a draft pack */
export async function deletePack(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("knowledge_packs")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Purchases                                                           */
/* ------------------------------------------------------------------ */

/** Check if a user has purchased a pack */
export async function hasPurchased(packId: string, userId: string): Promise<boolean> {
  const supabase = createClient();
  const { data } = await supabase
    .from("pack_purchases")
    .select("id")
    .eq("pack_id", packId)
    .eq("buyer_id", userId)
    .eq("status", "completed")
    .single();
  return !!data;
}

/** List purchases by buyer */
export async function listPurchases(buyerId: string): Promise<PackPurchase[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pack_purchases")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PackPurchase[];
}

/** List purchases for a pack (creator view) */
export async function listPackPurchases(packId: string): Promise<PackPurchase[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pack_purchases")
    .select("*")
    .eq("pack_id", packId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PackPurchase[];
}

/* ------------------------------------------------------------------ */
/* Reviews                                                             */
/* ------------------------------------------------------------------ */

/** List reviews for a pack */
export async function listReviews(packId: string): Promise<PackReview[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pack_reviews")
    .select("*")
    .eq("pack_id", packId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PackReview[];
}

/** Create a review (buyer only) */
export async function createReview(input: {
  pack_id: string;
  reviewer_id: string;
  rating: number;
  title?: string;
  body?: string;
}): Promise<PackReview> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("pack_reviews")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as PackReview;
}

/* ------------------------------------------------------------------ */
/* Import Jobs                                                         */
/* ------------------------------------------------------------------ */

/** List import jobs for a user */
export async function listImportJobs(userId: string): Promise<ImportJob[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ImportJob[];
}

/** Get a single import job */
export async function getImportJob(id: string): Promise<ImportJob | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as unknown as ImportJob;
}

/** Admin: approve a pending pack listing */
export async function approvePack(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("knowledge_packs")
    .update({
      status: "active" as const,
      published_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

/** Generate a URL-safe slug from a pack name */
export function generateSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now().toString(36)
  );
}
