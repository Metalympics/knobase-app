/**
 * School types - Maps to workspaces table in Supabase
 * "School" is the new terminology for what was previously "Workspace"
 */

export type SchoolRole = "admin" | "editor" | "viewer";

export interface SchoolSettings {
  isPublic: boolean;
  allowGuests: boolean;
  defaultAgent: string | null;
}

export interface School {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  settings: SchoolSettings;
  inviteCode: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  website?: string | null;
  /** Public URL to icon-logo.png in organization-custom-styles bucket */
  iconUrl?: string | null;
  /** Whether the school has uploaded a custom icon */
  useCustomIcon?: boolean;
  /** Current user's membership type in this school (from users.type) */
  userType?: string | null;
}

export interface SchoolMember {
  id: string;
  schoolId: string;
  userId: string;
  role: SchoolRole;
  joinedAt: string;
  user?: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export interface SchoolWithMembers extends School {
  members: SchoolMember[];
}

export interface CreateSchoolInput {
  name: string;
  icon?: string;
  color?: string;
  settings?: Partial<SchoolSettings>;
}

export interface UpdateSchoolInput {
  name?: string;
  description?: string | null;
  website?: string | null;
  icon?: string | null;
  color?: string | null;
  settings?: Partial<SchoolSettings>;
}

export type SchoolUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  schoolId: string;
  type: 'human' | 'agent';
  createdAt: string;
};

// Backward-compat aliases (school = workspace)
export type Workspace = School;
export type WorkspaceRole = SchoolRole;
export type WorkspaceWithMembers = SchoolWithMembers;
