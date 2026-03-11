/**
 * Supabase-backed page operations for MCP tools.
 * Replaces the localStorage-based document store for server-side usage.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface PageMeta {
  id: string;
  title: string;
  icon: string | null;
  parent_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface PageFull extends PageMeta {
  content_md: string;
  content_json: Record<string, unknown> | null;
  school_id: string;
  created_by: string;
  visibility: string;
}

export async function listPages(schoolId: string): Promise<PageMeta[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pages")
    .select("id, title, icon, parent_id, position, created_at, updated_at")
    .eq("school_id", schoolId)
    .order("position", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Failed to list pages: ${error.message}`);
  return (data ?? []) as PageMeta[];
}

export async function getPage(pageId: string): Promise<PageFull | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("id", pageId)
    .single();

  if (error) return null;
  return data as unknown as PageFull;
}

export async function createPage(params: {
  title: string;
  content_md?: string;
  school_id: string;
  created_by: string;
  parent_id?: string | null;
}): Promise<PageFull> {
  const supabase = createAdminClient();

  let position = 0;
  if (params.parent_id) {
    const { data: siblings } = await supabase
      .from("pages")
      .select("position")
      .eq("parent_id", params.parent_id)
      .order("position", { ascending: false })
      .limit(1);
    position = (siblings?.[0]?.position ?? -1) + 1;
  } else {
    const { data: siblings } = await supabase
      .from("pages")
      .select("position")
      .eq("school_id", params.school_id)
      .is("parent_id", null)
      .order("position", { ascending: false })
      .limit(1);
    position = (siblings?.[0]?.position ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from("pages")
    .insert({
      title: params.title,
      content_md: params.content_md ?? "",
      school_id: params.school_id,
      created_by: params.created_by,
      parent_id: params.parent_id ?? null,
      position,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create page: ${error.message}`);
  return data as unknown as PageFull;
}

export async function updatePageContent(
  pageId: string,
  updates: { title?: string; content_md?: string },
): Promise<PageFull | null> {
  const supabase = createAdminClient();

  const patch: Record<string, unknown> = {};
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.content_md !== undefined) patch.content_md = updates.content_md;

  if (Object.keys(patch).length === 0) return getPage(pageId);

  const { data, error } = await supabase
    .from("pages")
    .update(patch)
    .eq("id", pageId)
    .select()
    .single();

  if (error) return null;
  return data as unknown as PageFull;
}

export async function deletePage(pageId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("pages").delete().eq("id", pageId);
  return !error;
}

export async function searchPages(
  schoolId: string,
  query: string,
): Promise<PageFull[]> {
  const supabase = createAdminClient();
  const q = `%${query}%`;

  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("school_id", schoolId)
    .or(`title.ilike.${q},content_md.ilike.${q}`)
    .limit(20);

  if (error) return [];
  return (data ?? []) as unknown as PageFull[];
}

export async function getAgentProfile(agentId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", agentId)
    .single();

  if (error) return null;
  return data;
}

export async function updateAgentProfile(
  agentId: string,
  patch: { name?: string; description?: string; avatar_url?: string },
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .update(patch)
    .eq("id", agentId)
    .select()
    .single();

  if (error) return null;
  return data;
}

export async function listWorkspaceAgents(schoolId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, name, avatar_url, type")
    .eq("school_id", schoolId)
    .eq("type", "agent");

  if (error) return [];
  return data ?? [];
}
