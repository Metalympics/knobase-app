import type { WorkspaceRole } from "@/lib/workspaces/types";
import { getMyRole } from "@/lib/workspaces/store";

export type Permission =
  | "read"
  | "write"
  | "comment"
  | "invite_viewer"
  | "invite_editor"
  | "manage_members"
  | "delete_workspace"
  | "manage_settings"
  | "export_data";

const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  admin: [
    "read",
    "write",
    "comment",
    "invite_viewer",
    "invite_editor",
    "manage_members",
    "delete_workspace",
    "manage_settings",
    "export_data",
  ],
  editor: ["read", "write", "comment", "invite_viewer"],
  viewer: ["read", "comment"],
};

export function getPermissionsForRole(role: WorkspaceRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(
  workspaceId: string,
  permission: Permission,
): boolean {
  const role = getMyRole(workspaceId);
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canRead(workspaceId: string): boolean {
  return hasPermission(workspaceId, "read");
}

export function canWrite(workspaceId: string): boolean {
  return hasPermission(workspaceId, "write");
}

export function canComment(workspaceId: string): boolean {
  return hasPermission(workspaceId, "comment");
}

export function canManageMembers(workspaceId: string): boolean {
  return hasPermission(workspaceId, "manage_members");
}

export function canDeleteWorkspace(workspaceId: string): boolean {
  return hasPermission(workspaceId, "delete_workspace");
}

export function canInvite(
  workspaceId: string,
  targetRole: WorkspaceRole,
): boolean {
  if (targetRole === "admin") {
    return hasPermission(workspaceId, "manage_members");
  }
  if (targetRole === "editor") {
    return hasPermission(workspaceId, "invite_editor");
  }
  return hasPermission(workspaceId, "invite_viewer");
}

export type DocumentAccess = "private" | "shared" | "public";

const LS_PREFIX = "knobase-app:doc-access:";

export function getDocumentAccess(documentId: string): DocumentAccess {
  if (typeof window === "undefined") return "private";
  return (
    (localStorage.getItem(`${LS_PREFIX}${documentId}`) as DocumentAccess) ??
    "shared"
  );
}

export function setDocumentAccess(
  documentId: string,
  access: DocumentAccess,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${LS_PREFIX}${documentId}`, access);
}

export interface GuestAccess {
  token: string;
  workspaceId: string;
  expiresAt: string;
  createdBy: string;
}

const GUEST_KEY = "knobase-app:guest-tokens";

function readGuestTokens(): GuestAccess[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeGuestTokens(tokens: GuestAccess[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GUEST_KEY, JSON.stringify(tokens));
}

export function createGuestToken(
  workspaceId: string,
  durationHours = 24,
): GuestAccess {
  const token: GuestAccess = {
    token: crypto.randomUUID().replace(/-/g, "").slice(0, 16),
    workspaceId,
    expiresAt: new Date(
      Date.now() + durationHours * 60 * 60 * 1000,
    ).toISOString(),
    createdBy: "You",
  };
  const all = readGuestTokens();
  all.push(token);
  writeGuestTokens(all);
  return token;
}

export function validateGuestToken(token: string): {
  valid: boolean;
  workspaceId?: string;
} {
  const all = readGuestTokens();
  const entry = all.find((t) => t.token === token);
  if (!entry) return { valid: false };
  if (new Date(entry.expiresAt) < new Date()) return { valid: false };
  return { valid: true, workspaceId: entry.workspaceId };
}

export function revokeGuestToken(token: string): void {
  const all = readGuestTokens().filter((t) => t.token !== token);
  writeGuestTokens(all);
}

export function listGuestTokens(workspaceId: string): GuestAccess[] {
  return readGuestTokens().filter((t) => t.workspaceId === workspaceId);
}

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<WorkspaceRole, string> = {
  admin: "Full access, manage members, delete workspace",
  editor: "Read/write docs, invite viewers",
  viewer: "Read-only, can comment",
};
