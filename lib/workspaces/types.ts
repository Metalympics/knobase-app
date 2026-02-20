export type WorkspaceRole = "admin" | "editor" | "viewer";

export interface WorkspaceMember {
  userId: string;
  displayName: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface WorkspaceSettings {
  isPublic: boolean;
  allowGuests: boolean;
  defaultAgent: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  inviteCode: string;
  icon?: string;
  color?: string;
}

export type DocumentVisibility = "private" | "shared" | "public";
