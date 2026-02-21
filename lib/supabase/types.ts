import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./client";

export type TypedSupabaseClient = SupabaseClient<Database>;

export type AuthUser = {
  id: string;
  email: string;
  emailConfirmed: boolean;
};

export type UserProfile = Database["public"]["Tables"]["users"]["Row"];
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type WorkspaceMember =
  Database["public"]["Tables"]["workspace_members"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];

export type WorkspaceWithMembers = Workspace & {
  members: (WorkspaceMember & { user: UserProfile })[];
};

export type DocumentWithCreator = Document & {
  creator: UserProfile;
};

export type WorkspaceRole = "admin" | "editor" | "viewer";

export type CreateWorkspaceInput = {
  name: string;
  icon?: string;
  color?: string;
  settings?: {
    isPublic?: boolean;
    allowGuests?: boolean;
    defaultAgent?: string | null;
  };
};

export type CreateDocumentInput = {
  title: string;
  content: string;
  workspace_id: string;
  visibility?: "private" | "shared" | "public";
};

export type UpdateDocumentInput = {
  title?: string;
  content?: string;
  visibility?: "private" | "shared" | "public";
};

export type UpdateProfileInput = {
  display_name?: string;
  avatar_url?: string;
};

export type AddWorkspaceMemberInput = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
};

export type PermissionCheck = {
  canRead: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageMembers: boolean;
};
