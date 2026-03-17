/**
 * School Store - Supabase queries for schools (workspaces table)
 * Replaces localStorage-based workspace management
 */

import { createClient } from "@/lib/supabase/client";
import { ONBOARDING_TEMPLATES } from "@/lib/templates";
import type {
  School,
  SchoolMember,
  SchoolRole,
  SchoolSettings,
  SchoolWithMembers,
  CreateSchoolInput,
  UpdateSchoolInput,
  SchoolUser,
} from "./types";

/**
 * Generate a unique invite code
 */
function generateInviteCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(36))
    .join("")
    .slice(0, 8)
    .toUpperCase();
}

/**
 * Convert string to URL-safe slug
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const SUPABASE_URL =
  typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") : "";

/**
 * Builds the public icon URL for a school if it has a custom icon.
 * Icons live at: organization-custom-styles/{school_id}/icon-logo.png
 */
function buildIconUrl(schoolId: string, useCustomIcon: boolean): string | null {
  if (!useCustomIcon || !SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/organization-custom-styles/${schoolId}/icon-logo.png`;
}

/**
 * Convert a schools row + optional organization_settings row to School type.
 * The real schema stores display data in organization_settings:
 *   - site_title     → School.name
 *   - subdomain_id   → School.slug
 *   - default_bot_id → settings.defaultAgent
 *   - updated_at     → School.updatedAt
 *   - use_custom_icon + school_id → School.iconUrl
 * Owner is schools.admin_user_id (not owner_id which doesn't exist).
 */
function rowToSchoolWithSettings(schoolRow: any, os?: any, userType?: string | null): School {
  const useCustomIcon = os?.use_custom_icon === true;
  return {
    id: schoolRow.id,
    name: os?.site_title ?? schoolRow.name ?? "School",
    slug: os?.subdomain_id ?? schoolRow.slug ?? slugify(schoolRow.name ?? "school"),
    ownerId: schoolRow.admin_user_id ?? schoolRow.owner_id ?? "",
    createdAt: schoolRow.created_at ?? new Date().toISOString(),
    updatedAt: os?.updated_at ?? schoolRow.updated_at ?? new Date().toISOString(),
    settings: {
      isPublic: false,
      allowGuests: false,
      defaultAgent: os?.default_bot_id ?? null,
    },
    inviteCode: schoolRow.invite_code ?? "",
    icon: schoolRow.icon ?? null,
    color: schoolRow.color ?? null,
    iconUrl: buildIconUrl(schoolRow.id, useCustomIcon),
    useCustomIcon,
    userType: userType ?? null,
  };
}

/** Backward-compat wrapper for callers that don't have org settings */
function rowToSchool(row: any): School {
  return rowToSchoolWithSettings(row);
}

/**
 * Load a school by ID, joining organization_settings for display metadata.
 */
export async function loadSchool(schoolId: string): Promise<School | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .eq("id", schoolId)
      .single();

    if (error || !data) {
      console.error("Error loading school:", error);
      return null;
    }

    const { data: os } = await supabase
      .from("organization_settings")
      .select("site_title, subdomain_id, updated_at, memory_enabled, default_bot_id, use_custom_icon")
      .eq("school_id", schoolId)
      .maybeSingle();

    return rowToSchoolWithSettings(data, os);
  } catch (error) {
    console.error("Error loading school:", error);
    return null;
  }
}

/**
 * Update a school
 */
export async function updateSchool(
  schoolId: string,
  updates: UpdateSchoolInput
): Promise<School | null> {
  try {
    const supabase = createClient();
    
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      updateData.name = updates.name;
      updateData.slug = slugify(updates.name);
    }
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.settings !== undefined) {
      const currentSchool = await loadSchool(schoolId);
      if (currentSchool) {
        updateData.settings = {
          ...currentSchool.settings,
          ...updates.settings,
        };
      }
    }

    const { data, error } = await supabase
      .from("schools")
      .update(updateData)
      .eq("id", schoolId)
      .select()
      .single();

    if (error) {
      console.error("Error updating school:", error);
      return null;
    }

    return data ? rowToSchool(data) : null;
  } catch (error) {
    console.error("Error updating school:", error);
    return null;
  }
}

/**
 * Get school members (from users table)
 */
export async function getSchoolMembers(
  schoolId: string
): Promise<SchoolMember[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        workspace_id,
        user_id,
        role,
        joined_at,
        users:user_id (
          id,
          email,
          name,
          avatar_url
        )
      `)
      .eq("workspace_id", schoolId);

    if (error) {
      console.error("Error loading school members:", error);
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      schoolId: row.workspace_id,
      userId: row.user_id,
      role: row.role,
      joinedAt: row.joined_at,
      user: row.users ? {
        id: row.users.id,
        email: row.users.email,
        displayName: row.users.name,
        avatarUrl: row.users.avatar_url,
      } : undefined,
    }));
  } catch (error) {
    console.error("Error loading school members:", error);
    return [];
  }
}

/**
 * Get school with members
 */
export async function getSchoolWithMembers(
  schoolId: string
): Promise<SchoolWithMembers | null> {
  const school = await loadSchool(schoolId);
  if (!school) return null;

  const members = await getSchoolMembers(schoolId);

  return {
    ...school,
    members,
  };
}

/**
 * Get school settings (from workspace settings JSONB)
 */
export async function getSchoolSettings(
  schoolId: string
): Promise<SchoolSettings | null> {
  const school = await loadSchool(schoolId);
  return school?.settings ?? null;
}

/**
 * Create a new school.
 * Uses admin_user_id (not owner_id) to match the actual DB schema.
 * The primary users row (school_id IS NULL) is used as the owner.
 */
export async function createSchool(
  input: CreateSchoolInput
): Promise<School | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error("No authenticated user");
      return null;
    }

    // Primary user row has school_id = null — avoids 406 from multiple rows
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .is("school_id", null)
      .maybeSingle();

    if (!userData) {
      console.error("Primary user profile not found");
      return null;
    }

    const { data, error } = await supabase
      .from("schools")
      .insert({
        name: input.name,
        admin_user_id: userData.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating school:", error);
      return null;
    }

    if (data) {
      // Create org settings row with slug and default config
      await supabase.from("organization_settings").insert({
        school_id: data.id,
        site_title: input.name,
        subdomain_id: slugify(input.name) + "-" + generateInviteCode().toLowerCase(),
        memory_enabled: false,
      });

      // Create the users membership row for this workspace
      await supabase.from("users").insert({
        auth_id: user.id,
        email: user.email ?? "",
        name: userData.id,
        school_id: data.id,
      });

      // Seed onboarding template pages so new users land on meaningful content
      for (const template of ONBOARDING_TEMPLATES) {
        await supabase.from("pages").insert({
          title: template.title,
          icon: template.icon,
          content_md: template.content_md,
          school_id: data.id,
          created_by: userData.id,
          visibility: "private",
          position: template.position,
        });
      }
    }

    return data ? rowToSchoolWithSettings(data, { site_title: input.name, subdomain_id: slugify(input.name) }) : null;
  } catch (error) {
    console.error("Error creating school:", error);
    return null;
  }
}

/**
 * Delete a school
 */
export async function deleteSchool(schoolId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("schools")
      .delete()
      .eq("id", schoolId);

    if (error) {
      console.error("Error deleting school:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting school:", error);
    return false;
  }
}

/**
 * Regenerate school invite code
 */
export async function regenerateSchoolInviteCode(
  schoolId: string
): Promise<string | null> {
  try {
    const supabase = createClient();
    const newCode = generateInviteCode();

    const { data, error } = await supabase
      .from("schools")
      .update({ invite_code: newCode, updated_at: new Date().toISOString() })
      .eq("id", schoolId)
      .select("invite_code")
      .single();

    if (error) {
      console.error("Error regenerating invite code:", error);
      return null;
    }

    return data?.invite_code ?? null;
  } catch (error) {
    console.error("Error regenerating invite code:", error);
    return null;
  }
}

/**
 * List all schools for current user.
 * The users table has one row per workspace membership (all sharing the same
 * auth_id), so we query all rows for this auth user and collect the school_ids.
 */
export async function listUserSchools(): Promise<School[]> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Each membership is its own users row — query all by auth_id
    const { data: memberRows, error: memberError } = await supabase
      .from("users")
      .select("school_id, type")
      .eq("auth_id", user.id)
      .not("school_id", "is", null);

    if (memberError || !memberRows?.length) return [];

    const schoolIds = memberRows.map((r: any) => r.school_id).filter(Boolean) as string[];
    if (!schoolIds.length) return [];

    const [{ data: schoolRows }, { data: orgSettings }] = await Promise.all([
      supabase.from("schools").select("*").in("id", schoolIds),
      supabase
        .from("organization_settings")
        .select("school_id, site_title, subdomain_id, updated_at, memory_enabled, default_bot_id, use_custom_icon")
        .in("school_id", schoolIds),
    ]);

    if (!schoolRows?.length) return [];

    const settingsBySchool = Object.fromEntries(
      (orgSettings ?? []).map((os: any) => [os.school_id, os])
    );

    // Build a map of school_id → userType from the membership rows
    const typeBySchool = Object.fromEntries(
      memberRows.map((r: any) => [r.school_id, r.type ?? null])
    );

    return schoolRows.map((row: any) =>
      rowToSchoolWithSettings(row, settingsBySchool[row.id], typeBySchool[row.id])
    );
  } catch (error) {
    console.error("Error listing user schools:", error);
    return [];
  }
}

/**
 * Get users in a school (from users table filtered by school_id)
 * Note: This assumes a future migration adds school_id to users table
 * For now, we'll use users join
 */
export async function getSchoolUsers(schoolId: string): Promise<SchoolUser[]> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from("users")
      .select(`
        users:user_id (
          id,
          email,
          name,
          avatar_url,
          created_at
        )
      `)
      .eq("workspace_id", schoolId);

    if (error) {
      console.error("Error loading school users:", error);
      return [];
    }

    if (!data) return [];

    return data
      .filter((row: any) => row.users)
      .map((row: any) => ({
        id: row.users.id,
        email: row.users.email,
        displayName: row.users.name,
        avatarUrl: row.users.avatar_url,
        schoolId: schoolId,
        type: 'human' as const,
        createdAt: row.users.created_at,
      }));
  } catch (error) {
    console.error("Error loading school users:", error);
    return [];
  }
}

/**
 * Add member to school
 */
export async function addSchoolMember(
  schoolId: string,
  userId: string,
  role: "admin" | "editor" | "viewer" = "viewer"
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("users").update({
      school_id: schoolId,
      role,
    }).eq("id", userId);

    if (error) {
      console.error("Error adding school member:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error adding school member:", error);
    return false;
  }
}

/**
 * Remove member from school
 */
export async function removeSchoolMember(
  schoolId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("workspace_id", schoolId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error removing school member:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error removing school member:", error);
    return false;
  }
}

/**
 * Get the last active school ID from auth_profiles
 */
export async function getLastActiveSchoolId(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from("auth_profiles")
      .select("last_active_school_id")
      .eq("auth_id", user.id)
      .single();

    if (error || !data) return null;

    return data.last_active_school_id ?? null;
  } catch (error) {
    console.error("Error getting last active school:", error);
    return null;
  }
}

/**
 * Update the last active school ID in auth_profiles
 */
export async function updateLastActiveSchoolId(schoolId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { error } = await supabase
      .from("auth_profiles")
      .update({ last_active_school_id: schoolId })
      .eq("auth_id", user.id);

    if (error) {
      console.error("Error updating last active school:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating last active school:", error);
    return false;
  }
}

/**
 * Get the first workspace for the current user from users table
 */
export async function getFirstUserWorkspace(): Promise<string | null> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: users, error } = await supabase
      .from("users")
      .select("school_id")
      .eq("auth_id", user.id)
      .not("school_id", "is", null)
      .limit(1);

    if (error || !users || users.length === 0) return null;

    return users[0].school_id;
  } catch (error) {
    console.error("Error getting first user workspace:", error);
    return null;
  }
}

/** Backward-compat aliases */
export const addMember = addSchoolMember;
export const removeMember = removeSchoolMember;
export const changeMemberRole = updateSchoolMemberRole;

/**
 * Update member role
 */
export async function updateSchoolMemberRole(
  schoolId: string,
  userId: string,
  role: "admin" | "editor" | "viewer"
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ role })
      .eq("workspace_id", schoolId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error updating member role:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating member role:", error);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Synchronous localStorage compatibility layer                        */
/* (replaces the old localStorage-based workspace store)               */
/* ------------------------------------------------------------------ */

const LS_SCHOOLS = "knobase-app:schools";
const LS_ACTIVE_SCHOOL = "knobase-app:active-school-id";
const LS_ROLE_PREFIX = "knobase-app:role:";

function readSchoolsCache(): School[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_SCHOOLS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function cacheSchool(school: School): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readSchoolsCache();
    const idx = existing.findIndex((s) => s.id === school.id);
    if (idx >= 0) existing[idx] = school;
    else existing.push(school);
    localStorage.setItem(LS_SCHOOLS, JSON.stringify(existing));
  } catch {}
}

/** Synchronous read from local cache — use loadSchool() for fresh server data */
export function getWorkspace(id: string): School | null {
  return readSchoolsCache().find((s) => s.id === id) ?? null;
}

/** Synchronous list from local cache */
export function listWorkspaces(): School[] {
  return readSchoolsCache();
}

export function getActiveWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LS_ACTIVE_SCHOOL);
}

export function setActiveWorkspaceId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_ACTIVE_SCHOOL, id);
}

/** Returns first cached school or a placeholder; callers should redirect if placeholder */
export function getOrCreateDefaultWorkspace(): School {
  const schools = readSchoolsCache();
  if (schools.length > 0) return schools[0];
  const placeholder: School = {
    id: "default",
    name: "My School",
    slug: "my-school",
    ownerId: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: { isPublic: false, allowGuests: false, defaultAgent: null },
    inviteCode: "",
  };
  return placeholder;
}

/** Reads current Supabase user ID from localStorage auth token */
export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const key = Object.keys(localStorage).find(
      (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
    );
    if (!key) return null;
    const parsed = JSON.parse(localStorage.getItem(key) ?? "{}");
    return parsed?.user?.id ?? parsed?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Returns the cached role for a user in a given school */
export function getMyRole(schoolId: string): SchoolRole | null {
  if (typeof window === "undefined") return null;
  try {
    return (localStorage.getItem(`${LS_ROLE_PREFIX}${schoolId}`) as SchoolRole) ?? null;
  } catch {
    return null;
  }
}

export function setMyRole(schoolId: string, role: SchoolRole): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${LS_ROLE_PREFIX}${schoolId}`, role);
  } catch {}
}
