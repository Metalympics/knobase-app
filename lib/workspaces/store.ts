import type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceSettings,
} from "./types";
import { createClient } from "@/lib/supabase/client";

const LS_PREFIX = "knobase-app:";
const WORKSPACES_KEY = `${LS_PREFIX}workspaces`;
const ACTIVE_WS_KEY = `${LS_PREFIX}active-workspace`;
const CURRENT_USER_KEY = `${LS_PREFIX}current-user-id`;

function generateInviteCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(36))
    .join("")
    .slice(0, 8)
    .toUpperCase();
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getCurrentUserId(): string {
  if (typeof window === "undefined") return "local-user";
  let id = localStorage.getItem(CURRENT_USER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CURRENT_USER_KEY, id);
  }
  return id;
}

/* ------------------------------------------------------------------ */
/* localStorage helpers (fallback)                                     */
/* ------------------------------------------------------------------ */

function readAll(): Workspace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(workspaces: Workspace[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
}

/* ------------------------------------------------------------------ */
/* Supabase bridge helpers                                             */
/* ------------------------------------------------------------------ */

/**
 * Convert a Supabase workspace row + members to the client Workspace type.
 */
function rowToWorkspace(
  row: Record<string, unknown>,
  members: Record<string, unknown>[] = [],
): Workspace {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "Workspace",
    slug: (row.slug as string) ?? slugify((row.name as string) ?? "workspace"),
    ownerId: (row.owner_id as string) ?? "",
    createdAt: (row.created_at as string) ?? new Date().toISOString(),
    icon: (row.icon as string) ?? undefined,
    color: (row.color as string) ?? undefined,
    members: members.map((m) => ({
      userId: (m.user_id as string) ?? "",
      displayName: (m.display_name as string) ?? "Member",
      role: ((m.role as string) ?? "viewer") as WorkspaceRole,
      joinedAt: (m.joined_at as string) ?? new Date().toISOString(),
    })),
    settings: {
      isPublic: false,
      allowGuests: false,
      defaultAgent: null,
    },
    inviteCode: (row.invite_code as string) ?? "",
  };
}

/* ------------------------------------------------------------------ */
/* Public API — Supabase-first with localStorage fallback              */
/* ------------------------------------------------------------------ */

export function listWorkspaces(): Workspace[] {
  // Synchronous: use localStorage for now
  const userId = getCurrentUserId();
  return readAll().filter(
    (ws) =>
      ws.ownerId === userId || ws.members.some((m) => m.userId === userId),
  );
}

/**
 * Async version: try Supabase first, fall back to localStorage.
 */
export async function listWorkspacesAsync(): Promise<Workspace[]> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: memberRows } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id);

      if (memberRows && memberRows.length > 0) {
        const wsIds = (memberRows as unknown as { workspace_id: string }[]).map((r) => r.workspace_id);
        const { data: wsRows } = await supabase
          .from("workspaces")
          .select("*")
          .in("id", wsIds);

        if (wsRows && wsRows.length > 0) {
          // Fetch all members for these workspaces
          const { data: allMembers } = await supabase
            .from("workspace_members")
            .select("*")
            .in("workspace_id", wsIds);

          return wsRows.map((ws) => {
            const wsMembers = ((allMembers ?? []) as unknown as { workspace_id: string }[]).filter(
              (m) => m.workspace_id === (ws as unknown as { id: string }).id,
            );
            return rowToWorkspace(
              ws as unknown as Record<string, unknown>,
              wsMembers as unknown as Record<string, unknown>[],
            );
          });
        }
      }
    }
  } catch {
    // Supabase unavailable — fall through
  }

  return listWorkspaces(); // localStorage fallback
}

export function getWorkspace(id: string): Workspace | null {
  return readAll().find((ws) => ws.id === id) ?? null;
}

/**
 * Async version: try Supabase first, fall back to localStorage.
 */
export async function getWorkspaceAsync(id: string): Promise<Workspace | null> {
  try {
    const supabase = createClient();
    const { data: ws } = await supabase
      .from("workspaces")
      .select("*")
      .eq("id", id)
      .single();

    if (ws) {
      const { data: members } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", id);

      return rowToWorkspace(
        ws as unknown as Record<string, unknown>,
        (members ?? []) as unknown as Record<string, unknown>[],
      );
    }
  } catch {
    // Fall through
  }

  return getWorkspace(id);
}

export function getActiveWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_WS_KEY);
}

export function setActiveWorkspaceId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_WS_KEY, id);
}

export function getOrCreateDefaultWorkspace(): Workspace {
  const existing = listWorkspaces();
  if (existing.length > 0) {
    const activeId = getActiveWorkspaceId();
    const active = activeId ? existing.find((ws) => ws.id === activeId) : null;
    return active ?? existing[0];
  }

  const legacyName =
    (typeof window !== "undefined"
      ? localStorage.getItem("knobase-app:workspace")
      : null) ?? "My Workspace";

  return createWorkspace(legacyName);
}

export function createWorkspace(
  name: string,
  settings?: Partial<WorkspaceSettings>,
): Workspace {
  const userId = getCurrentUserId();
  const displayName =
    (typeof window !== "undefined"
      ? localStorage.getItem("knobase-app:workspace")
      : null) ?? "You";

  const workspace: Workspace = {
    id: crypto.randomUUID(),
    name,
    slug: slugify(name),
    ownerId: userId,
    createdAt: new Date().toISOString(),
    members: [
      {
        userId,
        displayName,
        role: "admin",
        joinedAt: new Date().toISOString(),
      },
    ],
    settings: {
      isPublic: false,
      allowGuests: false,
      defaultAgent: null,
      ...settings,
    },
    inviteCode: generateInviteCode(),
  };
  const all = readAll();
  all.push(workspace);
  writeAll(all);
  setActiveWorkspaceId(workspace.id);
  return workspace;
}

export function updateWorkspace(
  id: string,
  patch: Partial<Pick<Workspace, "name" | "icon" | "color" | "settings">>,
): Workspace | null {
  const all = readAll();
  const idx = all.findIndex((ws) => ws.id === id);
  if (idx === -1) return null;
  const ws = all[idx];
  if (patch.name !== undefined) {
    ws.name = patch.name;
    ws.slug = slugify(patch.name);
  }
  if (patch.icon !== undefined) ws.icon = patch.icon;
  if (patch.color !== undefined) ws.color = patch.color;
  if (patch.settings !== undefined)
    ws.settings = { ...ws.settings, ...patch.settings };
  writeAll(all);
  return ws;
}

export function deleteWorkspace(id: string): boolean {
  const all = readAll();
  const filtered = all.filter((ws) => ws.id !== id);
  if (filtered.length === all.length) return false;
  writeAll(filtered);
  if (getActiveWorkspaceId() === id) {
    const remaining = listWorkspaces();
    if (remaining.length > 0) setActiveWorkspaceId(remaining[0].id);
    else if (typeof window !== "undefined") {
      localStorage.removeItem(ACTIVE_WS_KEY);
    }
  }
  return true;
}

export function joinWorkspaceByCode(
  code: string,
  displayName = "Guest",
): Workspace | null {
  const all = readAll();
  const ws = all.find((w) => w.inviteCode.toUpperCase() === code.toUpperCase());
  if (!ws) return null;

  const userId = getCurrentUserId();
  if (ws.members.some((m) => m.userId === userId)) return ws;

  ws.members.push({
    userId,
    displayName,
    role: "viewer",
    joinedAt: new Date().toISOString(),
  });
  writeAll(all);
  return ws;
}

export function leaveWorkspace(id: string): boolean {
  const all = readAll();
  const ws = all.find((w) => w.id === id);
  if (!ws) return false;

  const userId = getCurrentUserId();
  if (ws.ownerId === userId) return false;

  ws.members = ws.members.filter((m) => m.userId !== userId);
  writeAll(all);
  return true;
}

export function addMember(
  workspaceId: string,
  member: Omit<WorkspaceMember, "joinedAt">,
): boolean {
  const all = readAll();
  const ws = all.find((w) => w.id === workspaceId);
  if (!ws) return false;
  if (ws.members.some((m) => m.userId === member.userId)) return false;

  ws.members.push({ ...member, joinedAt: new Date().toISOString() });
  writeAll(all);
  return true;
}

export function removeMember(workspaceId: string, userId: string): boolean {
  const all = readAll();
  const ws = all.find((w) => w.id === workspaceId);
  if (!ws) return false;
  if (ws.ownerId === userId) return false;

  const before = ws.members.length;
  ws.members = ws.members.filter((m) => m.userId !== userId);
  if (ws.members.length === before) return false;
  writeAll(all);
  return true;
}

export function changeMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
): boolean {
  const all = readAll();
  const ws = all.find((w) => w.id === workspaceId);
  if (!ws) return false;
  const member = ws.members.find((m) => m.userId === userId);
  if (!member) return false;
  member.role = role;
  writeAll(all);
  return true;
}

export function regenerateInviteCode(workspaceId: string): string | null {
  const all = readAll();
  const ws = all.find((w) => w.id === workspaceId);
  if (!ws) return null;
  ws.inviteCode = generateInviteCode();
  writeAll(all);
  return ws.inviteCode;
}

export function getMyRole(workspaceId: string): WorkspaceRole | null {
  const ws = getWorkspace(workspaceId);
  if (!ws) return null;
  const userId = getCurrentUserId();
  return ws.members.find((m) => m.userId === userId)?.role ?? null;
}

export { getCurrentUserId };
