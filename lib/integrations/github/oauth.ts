const LS_PREFIX = "knobase-app:";
const GITHUB_KEY = `${LS_PREFIX}github-connection`;

export interface GitHubConnection {
  accessToken: string;
  username: string;
  avatarUrl: string;
  connectedAt: string;
  selectedRepo?: string;
  selectedBranch?: string;
  autoSync: boolean;
  biDirectional: boolean;
}

export function getGitHubConnection(): GitHubConnection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GITHUB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveGitHubConnection(connection: GitHubConnection): void {
  localStorage.setItem(GITHUB_KEY, JSON.stringify(connection));
}

export function disconnectGitHub(): void {
  localStorage.removeItem(GITHUB_KEY);
}

export function getGitHubOAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? "your-github-client-id";
  const redirectUri = `${typeof window !== "undefined" ? window.location.origin : ""}/api/integrations/github/callback`;
  const scope = "repo,read:user";
  return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  scope: string;
}> {
  const response = await fetch("/api/integrations/github/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) throw new Error("Failed to exchange code for token");
  return response.json();
}

export async function fetchGitHubUser(token: string): Promise<{
  login: string;
  avatar_url: string;
  name: string;
}> {
  const response = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch GitHub user");
  return response.json();
}

export async function listRepos(token: string): Promise<
  { full_name: string; default_branch: string; private: boolean }[]
> {
  const response = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch repos");
  return response.json();
}

export async function listBranches(
  token: string,
  repo: string
): Promise<{ name: string }[]> {
  const response = await fetch(`https://api.github.com/repos/${repo}/branches`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Failed to fetch branches");
  return response.json();
}
