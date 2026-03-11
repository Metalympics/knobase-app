import { createClient } from "@/lib/supabase/client";

export interface SharedDocument {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  workspaceId: string;
  workspaceName: string;
  workspaceLogoUrl: string | null;
  visibility: "private" | "shared" | "public";
  role: "viewer" | "editor" | "admin";
}

/**
 * Returns the role string for a users.type value.
 * The real DB column is `type` (values: 'admin', 'student', …), not `role`.
 */
function typeToRole(type: string | null | undefined): "viewer" | "editor" | "admin" {
  if (type === "admin") return "admin";
  return "viewer";
}

/**
 * Get all users rows for the current auth user (one row per workspace).
 * Returns { primaryId, schoolIds, rowsBySchool }.
 */
async function getUserMemberships(supabase: ReturnType<typeof createClient>, authId: string) {
  const { data: rows } = await supabase
    .from("users")
    .select("id, school_id, type")
    .eq("auth_id", authId);

  if (!rows?.length) return null;

  const primaryRow = rows.find((r: any) => !r.school_id);
  const workspaceRows = rows.filter((r: any) => !!r.school_id);

  return {
    primaryId: primaryRow?.id ?? rows[0].id,
    allIds: rows.map((r: any) => r.id as string),
    workspaceRows: workspaceRows as Array<{ id: string; school_id: string; type: string | null }>,
    schoolIds: workspaceRows.map((r: any) => r.school_id as string),
  };
}

/**
 * Get documents shared with the current user across all workspaces,
 * excluding documents from the current workspace.
 */
export async function getSharedDocuments(
  currentWorkspaceId?: string
): Promise<SharedDocument[]> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("User not authenticated");
    return [];
  }

  const memberships = await getUserMemberships(supabase, user.id);
  if (!memberships) {
    console.error("User profile not found");
    return [];
  }

  const { primaryId, allIds, workspaceRows, schoolIds } = memberships;

  // ── 1. Explicit page permissions (pages shared with this user) ───
  const { data: permsData, error: permsError } = await supabase
    .from("page_permissions")
    .select("page_id, permission")
    .in("user_id", allIds);

  if (permsError) {
    console.error("Error fetching page permissions:", permsError.message || permsError);
  }

  const permToRole = (p: string): "viewer" | "editor" | "admin" =>
    p === "full" ? "admin" : p === "edit" ? "editor" : "viewer";

  // Resolve page details for explicitly-shared pages
  let sharesData: Array<{
    page_id: string;
    permission: string;
    page: { id: string; title: string; content_md: string; created_at: string; updated_at: string; school_id: string; visibility: string } | null;
  }> = [];

  if (permsData?.length) {
    const pageIds = permsData.map((p: any) => p.page_id);
    const { data: pageRows } = await supabase
      .from("pages")
      .select("id, title, content_md, created_at, updated_at, school_id, visibility")
      .in("id", pageIds);

    const pageMap = Object.fromEntries((pageRows ?? []).map((p: any) => [p.id, p]));

    sharesData = (permsData as any[])
      .map((p: any) => ({ page_id: p.page_id, permission: p.permission, page: pageMap[p.page_id] ?? null }))
      .filter((s) => s.page && (!currentWorkspaceId || s.page.school_id !== currentWorkspaceId));
  }

  // ── 2. Workspace membership pages (shared/public visibility) ──────────────
  const otherSchoolIds = schoolIds.filter((id) => id !== currentWorkspaceId);
  let additionalDocs: any[] = [];

  if (otherSchoolIds.length > 0) {
    const alreadySharedIds = sharesData.map((d) => d.page_id).filter(Boolean);

    let pagesQuery = supabase
      .from("pages")
      .select("id, title, content_md, created_at, updated_at, school_id, visibility")
      .in("school_id", otherSchoolIds)
      .or("visibility.eq.shared,visibility.eq.public");

    if (alreadySharedIds.length > 0) {
      pagesQuery = pagesQuery.not("id", "in", `(${alreadySharedIds.join(",")})`);
    }

    const { data: pagesData } = await pagesQuery;

    if (pagesData) {
      const { data: orgSettings } = await supabase
        .from("organization_settings")
        .select("school_id, site_title")
        .in("school_id", otherSchoolIds);

      const nameBySchool = Object.fromEntries(
        (orgSettings ?? []).map((os: any) => [os.school_id, os.site_title])
      );

      additionalDocs = pagesData.map((pg: any) => {
        const wsRow = workspaceRows.find((r) => r.school_id === pg.school_id);
        return {
          page: pg,
          workspace: { id: pg.school_id, name: nameBySchool[pg.school_id] ?? "School" },
          role: typeToRole(wsRow?.type),
        };
      });
    }
  }

  const allShares = [...sharesData, ...additionalDocs];

  // Fetch workspace names for permission-based shares
  const permSchoolIds = [...new Set(sharesData.map((s) => s.page?.school_id).filter(Boolean))] as string[];
  let nameBySchool: Record<string, string> = {};
  if (permSchoolIds.length > 0) {
    const { data: orgSettings } = await supabase
      .from("organization_settings")
      .select("school_id, site_title")
      .in("school_id", permSchoolIds);
    nameBySchool = Object.fromEntries(
      (orgSettings ?? []).map((os: any) => [os.school_id, os.site_title])
    );
  }

  return allShares
    .filter((share) => share.page)
    .map((share) => {
      const role = "permission" in share
        ? permToRole(share.permission)
        : share.role || "viewer";
      const wsId = share.page.school_id;
      const wsName = "workspace" in share && share.workspace
        ? share.workspace.name
        : nameBySchool[wsId] ?? "Unknown Workspace";
      return {
        id: share.page.id,
        title: share.page.title || "Untitled",
        content: share.page.content_md || "",
        createdAt: share.page.created_at,
        updatedAt: share.page.updated_at,
        workspaceId: wsId,
        workspaceName: wsName,
        workspaceLogoUrl: null,
        visibility: share.page.visibility || "private",
        role,
      };
    });
}

/**
 * Check if user has access to a specific document.
 */
export async function checkDocumentAccess(
  documentId: string
): Promise<{ hasAccess: boolean; role?: string; workspaceId?: string }> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { hasAccess: false };

  const memberships = await getUserMemberships(supabase, user.id);
  if (!memberships) return { hasAccess: false };

  const { allIds, workspaceRows } = memberships;

  // Check explicit page permissions
  const { data: permData } = await supabase
    .from("page_permissions")
    .select("permission")
    .eq("page_id", documentId)
    .in("user_id", allIds)
    .maybeSingle();

  if (permData) {
    const role = permData.permission === "full" ? "admin" : permData.permission === "edit" ? "editor" : "viewer";
    const { data: pg } = await supabase.from("pages").select("school_id").eq("id", documentId).single();
    return { hasAccess: true, role, workspaceId: pg?.school_id };
  }

  // Check workspace membership
  const { data: pageData } = await supabase
    .from("pages")
    .select("school_id, visibility")
    .eq("id", documentId)
    .single();

  if (!pageData) return { hasAccess: false };

  const membership = workspaceRows.find((r) => r.school_id === pageData.school_id);
  if (membership) {
    return {
      hasAccess: true,
      role: typeToRole(membership.type),
      workspaceId: pageData.school_id,
    };
  }

  if (pageData.visibility === "public") {
    return { hasAccess: true, role: "viewer", workspaceId: pageData.school_id };
  }

  return { hasAccess: false };
}

/**
 * Accept an invite and get the document/workspace info.
 */
export async function acceptInvite(token: string): Promise<{
  success: boolean;
  documentId?: string;
  workspaceId?: string;
  error?: string;
}> {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: "Not authenticated" };

  const memberships = await getUserMemberships(supabase, user.id);
  if (!memberships) return { success: false, error: "User profile not found" };

  const { primaryId } = memberships;

  const { data: invite, error: inviteError } = await supabase
    .from("invites")
    .select("*")
    .eq("token", token)
    .single();

  if (inviteError || !invite) return { success: false, error: "Invalid invite token" };
  if (new Date(invite.expires_at) < new Date()) return { success: false, error: "Invite has expired" };
  if (invite.used_at) return { success: false, error: "Invite already used" };

  // Grant permission on the page via page_permissions
  const permissionMap: Record<string, "full" | "edit" | "comment" | "view"> = {
    admin: "full", editor: "edit", viewer: "view",
  };
  const { error: shareError } = await supabase
    .from("page_permissions")
    .insert({
      page_id: invite.document_id!,
      user_id: primaryId,
      permission: permissionMap[invite.role ?? "viewer"] ?? "view",
      granted_by: invite.invited_by,
    });

  if (shareError && !shareError.message?.includes("duplicate")) {
    console.error("Error creating page share:", shareError);
    return { success: false, error: "Failed to accept invite" };
  }

  await supabase
    .from("invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invite.id);

  return {
    success: true,
    documentId: invite.document_id ?? undefined,
    workspaceId: invite.school_id ?? undefined,
  };
}
