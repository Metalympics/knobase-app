const LS_PREFIX = "knobase-app:";
const SLACK_KEY = `${LS_PREFIX}slack-connection`;

export interface SlackConnection {
  accessToken: string;
  botToken: string;
  teamId: string;
  teamName: string;
  channelId?: string;
  channelName?: string;
  connectedAt: string;
  notifyOnCreate: boolean;
  notifyOnUpdate: boolean;
  notifyOnComment: boolean;
}

export function getSlackConnection(): SlackConnection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SLACK_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSlackConnection(connection: SlackConnection): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SLACK_KEY, JSON.stringify(connection));
}

export function disconnectSlack(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SLACK_KEY);
}

export function disconnectSlack(): void {
  localStorage.removeItem(SLACK_KEY);
}

export function getSlackOAuthUrl(): string {
  const clientId =
    process.env.NEXT_PUBLIC_SLACK_CLIENT_ID ?? "your-slack-client-id";
  const redirectUri = `${typeof window !== "undefined" ? window.location.origin : ""}/api/integrations/slack/callback`;
  const scopes = "channels:read,chat:write,commands,incoming-webhook";
  return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}`;
}

export async function exchangeSlackCode(code: string): Promise<{
  access_token: string;
  bot_user_id: string;
  team: { id: string; name: string };
}> {
  const response = await fetch("/api/integrations/slack/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) throw new Error("Failed to exchange Slack code");
  return response.json();
}

export async function listSlackChannels(
  token: string,
): Promise<{ id: string; name: string; is_private: boolean }[]> {
  const response = await fetch("https://slack.com/api/conversations.list", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return data.channels ?? [];
}
