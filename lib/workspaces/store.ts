import type { Workspace, WorkspaceMember, WorkspaceRole, WorkspaceSettings } from "./types";

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
  localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
}

export function listWorkspaces(): Workspace[] {
  const userId = getCurrentUserId();
  return readAll().filter(
    (ws) => ws.ownerId === userId || ws.members.some((m) => m.userId === userId)
  );
}

export function getWorkspace(id: string): Workspace | null {
  return readAll().find((ws) => ws.id === id) ?? null;
}

export function getActiveWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_WS_KEY);
}

export function setActiveWorkspaceId(id: string): void {
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
  settings?: Partial<WorkspaceSettings>
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
  patch: Partial<Pick<Workspace, "name" | "icon" | "color" | "settings">>
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
    else localStorage.removeItem(ACTIVE_WS_KEY);
  }
  return true;
}

export function joinWorkspaceByCode(
  code: string,
  displayName = "Guest"
): Workspace | null {
  const all = readAll();
  const ws = all.find(
    (w) => w.inviteCode.toUpperCase() === code.toUpperCase()
  );
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
  member: Omit<WorkspaceMember, "joinedAt">
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
  role: WorkspaceRole
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
