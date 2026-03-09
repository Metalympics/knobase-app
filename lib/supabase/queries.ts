// Supabase queries for schools-based multi-tenancy

import { createClient } from "./server";
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
  return user.schools;
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
/* Document queries                                                   */
/* ------------------------------------------------------------------ */

export async function getSchoolDocuments(schoolId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("documents")
    .select("*, users:created_by(id, display_name, avatar_url)")
    .eq("school_id", schoolId)
    .order("updated_at", { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function getDocumentById(documentId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("documents")
    .select("*, users:created_by(id, display_name, avatar_url), schools:school_id(*)")
    .eq("id", documentId)
    .single();
    
  if (error) throw error;
  return data;
}

export async function createDocument(params: {
  title: string;
  content?: string;
  school_id: string;
  created_by: string;
  visibility?: string;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("documents")
    .insert(params)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateDocument(
  documentId: string,
  updates: {
    title?: string;
    content?: string;
    visibility?: string;
  }
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("documents")
    .update(updates)
    .eq("id", documentId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteDocument(documentId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);
    
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Permissions                                                        */
/* ------------------------------------------------------------------ */

export async function canAccessDocument(userId: string, documentId: string) {
  const supabase = await createClient();
  
  // Get user's school
  const { data: user } = await supabase
    .from("users")
    .select("school_id")
    .eq("id", userId)
    .single();
    
  if (!user?.school_id) return false;
  
  // Check if document belongs to same school
  const { data: doc } = await supabase
    .from("documents")
    .select("school_id, visibility")
    .eq("id", documentId)
    .single();
    
  if (!doc) return false;
  
  // Same school = access granted
  if (doc.school_id === user.school_id) return true;
  
  // Public documents are accessible
  if (doc.visibility === "public") return true;
  
  return false;
}

export async function canEditDocument(userId: string, documentId: string) {
  const supabase = await createClient();
  
  // Get user's school and role
  const { data: user } = await supabase
    .from("users")
    .select("school_id, role")
    .eq("id", userId)
    .single();
    
  if (!user?.school_id) return false;
  
  // Check if document belongs to same school
  const { data: doc } = await supabase
    .from("documents")
    .select("school_id, created_by")
    .eq("id", documentId)
    .single();
    
  if (!doc || doc.school_id !== user.school_id) return false;
  
  // Owner can always edit
  if (doc.created_by === userId) return true;
  
  // Admins and editors can edit school documents
  if (user.role === "admin" || user.role === "editor") return true;
  
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
  await updateUserSchool(userId, invite.school_id);
  
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
