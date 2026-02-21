export interface GuestToken {
  token: string;
  workspaceId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  label?: string;
}

export interface GuestSession {
  token: string;
  workspaceId: string;
  startedAt: string;
  expiresAt: string;
}

const TOKENS_KEY = "knobase-app:guest-tokens";
const SESSION_KEY = "knobase-app:guest-session";

function readTokens(): GuestToken[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeTokens(tokens: GuestToken[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export function generateGuestToken(
  workspaceId: string,
  createdBy: string,
  durationHours = 24,
  label?: string,
): GuestToken {
  const token: GuestToken = {
    token: `guest_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    workspaceId,
    createdBy,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(
      Date.now() + durationHours * 60 * 60 * 1000,
    ).toISOString(),
    label,
  };
  const all = readTokens();
  all.push(token);
  writeTokens(all);
  return token;
}

export function listGuestTokens(workspaceId: string): GuestToken[] {
  return readTokens()
    .filter((t) => t.workspaceId === workspaceId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function validateGuestToken(tokenStr: string): {
  valid: boolean;
  token?: GuestToken;
} {
  const all = readTokens();
  const token = all.find((t) => t.token === tokenStr);
  if (!token) return { valid: false };
  if (new Date(token.expiresAt) < new Date()) return { valid: false };
  return { valid: true, token };
}

export function revokeGuestToken(tokenStr: string): boolean {
  const all = readTokens();
  const filtered = all.filter((t) => t.token !== tokenStr);
  if (filtered.length === all.length) return false;
  writeTokens(filtered);
  return true;
}

export function revokeAllGuestTokens(workspaceId: string): void {
  writeTokens(readTokens().filter((t) => t.workspaceId !== workspaceId));
}

// Guest session management

export function startGuestSession(token: GuestToken): GuestSession {
  const session: GuestSession = {
    token: token.token,
    workspaceId: token.workspaceId,
    startedAt: new Date().toISOString(),
    expiresAt: token.expiresAt,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

export function getGuestSession(): GuestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: GuestSession = JSON.parse(raw);
    if (new Date(session.expiresAt) < new Date()) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(SESSION_KEY);
      }
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function endGuestSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function isGuestMode(): boolean {
  return getGuestSession() !== null;
}

export function getGuestTimeRemaining(): number {
  const session = getGuestSession();
  if (!session) return 0;
  return Math.max(0, new Date(session.expiresAt).getTime() - Date.now());
}
