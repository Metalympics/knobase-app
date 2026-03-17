// Supabase queries for schools-based multi-tenancy

import { createServerClient as createClient } from "./server";
import type { TypedSupabaseClient } from "./types";

/* ------------------------------------------------------------------ */
/* School queries                                                     */
/* ------------------------------------------------------------------ */

export async function getSchoolById(schoolId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .eq("id", schoolId)
    .single();
    
  if (error) throw error;
  return data;
}

export async function getSchoolBySlug(slug: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .eq("slug", slug)
    .single();
    
  if (error) throw error;
  return data;
}

export async function getUserSchool(userId: string) {
  const supabase = await createClient();
  
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("school_id, schools:school_id(*)")
    .eq("id", userId)
    .single();
    
  if (userError) throw userError;
  return (user as unknown as Record<string, any>).schools;
}

export async function getSchoolMembers(schoolId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("school_id", schoolId);
    
  if (error) throw error;
  return data;
}

export async function createSchool(params: {
  name: string;
  slug: string;
  owner_id: string;
  invite_code?: string;
  settings?: Record<string, any>;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("schools")
    .insert(params)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateSchool(
  schoolId: string,
  updates: {
    name?: string;
    slug?: string;
    logo_url?: string;
    settings?: Record<string, any>;
  }
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("schools")
    .update(updates)
    .eq("id", schoolId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/* User queries                                                       */
/* ------------------------------------------------------------------ */

export async function getUserById(userId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("users")
    .select("*, schools:school_id(*)")
    .eq("id", userId)
    .single();
    
  if (error) throw error;
  return data;
}

export async function getUserByAuthId(authId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("users")
    .select("*, schools:school_id(*)")
    .eq("auth_id", authId)
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateUserSchool(userId: string, schoolId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("users")
    .update({ school_id: schoolId })
    .eq("id", userId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/* Page queries (workspace editor pages — not knowledge-base docs)    */
/* ------------------------------------------------------------------ */

export async function getSchoolPages(schoolId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pages")
    .select("*, users:created_by(id, name, avatar_url)")
    .eq("school_id", schoolId)
    .order("position", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getChildPages(parentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pages")
    .select("id, title, icon, parent_id, position, updated_at")
    .eq("parent_id", parentId)
    .order("position", { ascending: true });

  if (error) throw error;
  return data;
}

export async function movePage(
  pageId: string,
  newParentId: string | null,
) {
  const supabase = await createClient();

  let position = 0;
  if (newParentId) {
    const { data: siblings } = await supabase
      .from("pages")
      .select("position")
      .eq("parent_id", newParentId)
      .neq("id", pageId)
      .order("position", { ascending: false })
      .limit(1);
    position = (siblings?.[0]?.position ?? -1) + 1;
  } else {
    const { data: page } = await supabase
      .from("pages")
      .select("school_id")
      .eq("id", pageId)
      .maybeSingle();
    if (page) {
      const { data: siblings } = await supabase
        .from("pages")
        .select("position")
        .eq("school_id", page.school_id)
        .is("parent_id", null)
        .neq("id", pageId)
        .order("position", { ascending: false })
        .limit(1);
      position = (siblings?.[0]?.position ?? -1) + 1;
    }
  }

  const { data, error } = await supabase
    .from("pages")
    .update({ parent_id: newParentId, position })
    .eq("id", pageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPageAncestors(pageId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("get_page_ancestors", { page_uuid: pageId });

  if (error) throw error;
  return data;
}

export async function getPageById(pageId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pages")
    .select("*, users:created_by(id, name, avatar_url), schools:school_id(*)")
    .eq("id", pageId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createPage(params: {
  title?: string;
  content_md?: string;
  content_json?: Record<string, unknown> | null;
  icon?: string | null;
  parent_id?: string | null;
  position?: number;
  school_id: string;
  created_by: string;
  visibility?: "private" | "shared" | "public";
}) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pages")
    .insert(params)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePage(
  pageId: string,
  updates: {
    title?: string;
    content_md?: string;
    content_json?: Record<string, unknown> | null;
    icon?: string | null;
    parent_id?: string | null;
    position?: number;
    visibility?: "private" | "shared" | "public";
  }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pages")
    .update(updates)
    .eq("id", pageId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePage(pageId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("pages")
    .delete()
    .eq("id", pageId);

  if (error) throw error;
}

// Legacy aliases for backward compatibility during migration
export const getSchoolDocuments = getSchoolPages;
export const getDocumentById = getPageById;
export const createDocument = (params: {
  title: string;
  content?: string;
  school_id: string;
  created_by: string;
  visibility?: "private" | "shared" | "public";
}) => createPage({ ...params, content_md: params.content });
export const updateDocument = (
  documentId: string,
  updates: { title?: string; content?: string; visibility?: "private" | "shared" | "public" }
) => updatePage(documentId, { ...updates, content_md: updates.content });
export const deleteDocument = deletePage;

/* ------------------------------------------------------------------ */
/* Permissions                                                        */
/* ------------------------------------------------------------------ */

export async function canAccessDocument(userId: string, pageId: string) {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from("users")
    .select("school_id")
    .eq("id", userId)
    .maybeSingle();

  if (!user?.school_id) return false;

  const { data: page } = await supabase
    .from("pages")
    .select("school_id, visibility")
    .eq("id", pageId)
    .maybeSingle();

  if (!page) return false;
  if (page.school_id === user.school_id) return true;
  if (page.visibility === "public") return true;

  return false;
}

export async function canEditDocument(userId: string, pageId: string) {
  const supabase = await createClient();

  const { data: user } = await supabase
    .from("users")
    .select("school_id, role_id")
    .eq("id", userId)
    .maybeSingle();

  if (!user?.school_id) return false;

  const { data: page } = await supabase
    .from("pages")
    .select("school_id, created_by")
    .eq("id", pageId)
    .maybeSingle();

  if (!page || page.school_id !== user.school_id) return false;
  if (page.created_by === userId) return true;
  if ((user as any).role_id === "admin" || (user as any).role_id === "editor") return true;

  return false;
}

/* ------------------------------------------------------------------ */
/* Invites                                                            */
/* ------------------------------------------------------------------ */

export async function createInvite(params: {
  email: string;
  school_id: string;
  invited_by: string;
  role?: string;
  document_id?: string;
  expires_at: string;
}) {
  const supabase = await createClient();
  
  const token = crypto.randomUUID();
  
  const { data, error } = await supabase
    .from("invites")
    .insert({
      token,
      ...params,
      role: params.role || "editor",
    })
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function getInviteByToken(token: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("invites")
    .select("*, schools:school_id(*)")
    .eq("token", token)
    .single();
    
  if (error) throw error;
  return data;
}

export async function acceptInvite(inviteId: string, userId: string) {
  const supabase = await createClient();
  
  // Get invite
  const { data: invite } = await supabase
    .from("invites")
    .select("school_id")
    .eq("id", inviteId)
    .single();
    
  if (!invite) throw new Error("Invite not found");
  
  // Update user's school
  if (invite.school_id) {
    await updateUserSchool(userId, invite.school_id);
  }
  
  // Mark invite as used
  await supabase
    .from("invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", inviteId);
}

/* ------------------------------------------------------------------ */
/* Bots                                                               */
/* ------------------------------------------------------------------ */

export async function getSchoolBots(schoolId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("bots")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function getBotById(botId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("bots")
    .select("*")
    .eq("id", botId)
    .single();
    
  if (error) throw error;
  return data;
}

export async function createBot(params: {
  name: string;
  school_id: string;
  created_by: string;
  system_prompt?: string;
  model?: string;
  config?: Record<string, any>;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("bots")
    .insert(params)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}
