/**
 * School Store - Supabase queries for schools (workspaces table)
 * Replaces localStorage-based workspace management
 */

import { createClient } from "@/lib/supabase/client";
import type {
  School,
  SchoolMember,
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

/**
 * Convert Supabase workspace row to School type
 */
function rowToSchool(row: any): School {
  return {
    id: row.id,
    name: row.name ?? "School",
    slug: row.slug ?? slugify(row.name ?? "school"),
    ownerId: row.owner_id ?? "",
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
    settings: (row.settings as SchoolSettings) ?? {
      isPublic: false,
      allowGuests: false,
      defaultAgent: null,
    },
    inviteCode: row.invite_code ?? "",
    icon: row.icon,
    color: row.color,
  };
}

/**
 * Load a school by ID
 */
export async function loadSchool(schoolId: string): Promise<School | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", schoolId)
      .single();

    if (error) {
      console.error("Error loading school:", error);
      return null;
    }

    if (!data) return null;

    return rowToSchool(data);
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
      .from("workspaces")
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
 * Get school members (from workspace_members table)
 */
export async function getSchoolMembers(
  schoolId: string
): Promise<SchoolMember[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("workspace_members")
      .select(`
        id,
        workspace_id,
        user_id,
        role,
        joined_at,
        users:user_id (
          id,
          email,
          display_name,
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
        displayName: row.users.display_name,
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
 * Create a new school
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

    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!userData) {
      console.error("User profile not found");
      return null;
    }

    const insertData = {
      name: input.name,
      slug: slugify(input.name),
      owner_id: userData.id,
      invite_code: generateInviteCode(),
      icon: input.icon ?? null,
      color: input.color ?? null,
      settings: {
        isPublic: false,
        allowGuests: false,
        defaultAgent: null,
        ...input.settings,
      },
    };

    const { data, error } = await supabase
      .from("workspaces")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error creating school:", error);
      return null;
    }

    if (data) {
      await supabase.from("workspace_members").insert({
        workspace_id: data.id,
        user_id: userData.id,
        role: "admin",
      });
    }

    return data ? rowToSchool(data) : null;
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
      .from("workspaces")
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
      .from("workspaces")
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
 * List all schools for current user
 */
export async function listUserSchools(): Promise<School[]> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!userData) return [];

    const { data: memberRows } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userData.id);

    if (!memberRows || memberRows.length === 0) return [];

    const workspaceIds = memberRows.map((r) => r.workspace_id);
    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("*")
      .in("id", workspaceIds);

    if (!workspaces) return [];

    return workspaces.map(rowToSchool);
  } catch (error) {
    console.error("Error listing user schools:", error);
    return [];
  }
}

/**
 * Get users in a school (from users table filtered by school_id)
 * Note: This assumes a future migration adds school_id to users table
 * For now, we'll use workspace_members join
 */
export async function getSchoolUsers(schoolId: string): Promise<SchoolUser[]> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from("workspace_members")
      .select(`
        users:user_id (
          id,
          email,
          display_name,
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
        displayName: row.users.display_name,
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
    const { error } = await supabase.from("workspace_members").insert({
      workspace_id: schoolId,
      user_id: userId,
      role,
    });

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
      .from("workspace_members")
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
      .from("workspace_members")
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
