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

  return profile as unknown as Tables<"users">;
}

export async function getUserWorkspaces(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Tables<"schools">[]> {
  const { data: profile } = await supabase
    .from("users")
    .select("school_id")
    .eq("id", userId)
    .single();

  if (!profile?.school_id) return [];

  const { data, error } = await supabase
    .from("schools")
    .select("*")
    .eq("id", profile.school_id);

  if (error) {
    console.error("Error fetching schools:", error);
    return [];
  }

  return (data ?? []) as unknown as Tables<"schools">[];
}

export async function getUserWorkspaceRole(
  supabase: SupabaseClient<Database>,
  schoolId: string,
  userId: string
): Promise<"admin" | "editor" | "viewer" | null> {
  const { data, error } = await supabase
    .from("users")
    .select("role, school_id")
    .eq("id", userId)
    .single();

  if (error || !data) {
    console.error("Error fetching user role:", error);
    return null;
  }

  const user = data as unknown as { role: string | null; school_id: string | null };
  if (user.school_id !== schoolId) return null;

  return (user.role as "admin" | "editor" | "viewer") ?? null;
}

export async function canEditDocument(
  supabase: SupabaseClient<Database>,
  documentId: string,
  userId: string
): Promise<boolean> {
  const { data: docData, error: docError } = await supabase
    .from("documents")
    .select("school_id, created_by")
    .eq("id", documentId)
    .single();

  if (docError || !docData) {
    return false;
  }

  const doc = docData as unknown as { school_id: string; created_by: string };
  if (doc.created_by === userId) {
    return true;
  }

  const role = await getUserWorkspaceRole(supabase, doc.school_id, userId);
  return role === "admin" || role === "editor";
}

export async function canDeleteDocument(
  supabase: SupabaseClient<Database>,
  documentId: string,
  userId: string
): Promise<boolean> {
  const { data: docData2, error: docError } = await supabase
    .from("documents")
    .select("school_id, created_by")
    .eq("id", documentId)
    .single();

  if (docError || !docData2) {
    return false;
  }

  const doc2 = docData2 as unknown as { school_id: string; created_by: string };
  if (doc2.created_by === userId) {
    return true;
  }

  const role = await getUserWorkspaceRole(supabase, doc2.school_id, userId);
  return role === "admin";
}

export async function isWorkspaceAdmin(
  supabase: SupabaseClient<Database>,
  schoolId: string,
  userId: string
): Promise<boolean> {
  const { data: school, error: wsError } = await supabase
    .from("schools")
    .select("owner_id")
    .eq("id", schoolId)
    .single();

  if (wsError || !school) {
    return false;
  }

  if ((school as unknown as { owner_id: string }).owner_id === userId) {
    return true;
  }

  const role = await getUserWorkspaceRole(supabase, schoolId, userId);
  return role === "admin";
}

export async function getUsersByWorkspace(
  supabase: SupabaseClient<Database>,
  schoolId: string
): Promise<Array<Tables<"users"> & { role: "admin" | "editor" | "viewer" }>> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("school_id", schoolId);

  if (error) {
    console.error("Error fetching school users:", error);
    return [];
  }

  return (data ?? []).map((item: any) => ({
    ...item,
    role: (item.role ?? "viewer") as "admin" | "editor" | "viewer",
  }));
}

export async function getWorkspaceDocuments(
  supabase: SupabaseClient<Database>,
  schoolId: string,
  _userId: string
): Promise<Tables<"documents">[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("school_id", schoolId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching school documents:", error);
    return [];
  }

  return (data ?? []) as unknown as Tables<"documents">[];
}
