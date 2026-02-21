import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/client";

export async function getCurrentUser(
  supabase: SupabaseClient<Database>
): Promise<Tables<"users"> | null> {
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("auth_id", authUser.id)
    .single();

  if (profileError) {
    console.error("Error fetching user profile:", profileError);
    return null;
  }

  return profile;
}

export async function getUserWorkspaces(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Tables<"workspaces">[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select(
      `
      *,
      workspace_members!inner(*)
    `
    )
    .eq("workspace_members.user_id", userId);

  if (error) {
    console.error("Error fetching workspaces:", error);
    return [];
  }

  return data as unknown as Tables<"workspaces">[];
}

export async function getUserWorkspaceRole(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  userId: string
): Promise<"admin" | "editor" | "viewer" | null> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching workspace role:", error);
    return null;
  }

  return data.role;
}

export async function canEditDocument(
  supabase: SupabaseClient<Database>,
  documentId: string,
  userId: string
): Promise<boolean> {
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("workspace_id, created_by")
    .eq("id", documentId)
    .single();

  if (docError || !doc) {
    return false;
  }

  if (doc.created_by === userId) {
    return true;
  }

  const role = await getUserWorkspaceRole(supabase, doc.workspace_id, userId);
  return role === "admin" || role === "editor";
}

export async function canDeleteDocument(
  supabase: SupabaseClient<Database>,
  documentId: string,
  userId: string
): Promise<boolean> {
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("workspace_id, created_by")
    .eq("id", documentId)
    .single();

  if (docError || !doc) {
    return false;
  }

  if (doc.created_by === userId) {
    return true;
  }

  const role = await getUserWorkspaceRole(supabase, doc.workspace_id, userId);
  return role === "admin";
}

export async function isWorkspaceAdmin(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  userId: string
): Promise<boolean> {
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .single();

  if (wsError || !workspace) {
    return false;
  }

  if (workspace.owner_id === userId) {
    return true;
  }

  const role = await getUserWorkspaceRole(supabase, workspaceId, userId);
  return role === "admin";
}

export async function getUsersByWorkspace(
  supabase: SupabaseClient<Database>,
  workspaceId: string
): Promise<
  Array<Tables<"users"> & { role: "admin" | "editor" | "viewer" }>
> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      `
      role,
      users (*)
    `
    )
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("Error fetching workspace users:", error);
    return [];
  }

  return data.map((item: any) => ({
    ...item.users,
    role: item.role,
  }));
}

export async function getWorkspaceDocuments(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  userId: string
): Promise<Tables<"documents">[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching workspace documents:", error);
    return [];
  }

  return data;
}
