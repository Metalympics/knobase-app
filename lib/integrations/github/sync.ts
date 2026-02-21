import { getGitHubConnection } from "./oauth";

const LS_PREFIX = "knobase-app:";
const SYNC_LOG_KEY = `${LS_PREFIX}github-sync-log`;

export interface SyncLogEntry {
  id: string;
  action: "push" | "pull" | "pr_created";
  documentId?: string;
  fileName: string;
  sha?: string;
  timestamp: string;
  status: "success" | "error";
  message?: string;
}

function getSyncLog(): SyncLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SYNC_LOG_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function addSyncLog(entry: SyncLogEntry): void {
  const log = getSyncLog();
  log.push(entry);
  if (log.length > 200) log.splice(0, log.length - 200);
  if (typeof window === "undefined") return;
  localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(log));
}

export function getRecentSyncLogs(): SyncLogEntry[] {
  return getSyncLog()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 50);
}

function docToMarkdown(doc: {
  title: string;
  content: string;
  tags?: string[];
}): string {
  const frontmatter: string[] = ["---"];
  frontmatter.push(`title: "${doc.title.replace(/"/g, '\\"')}"`);
  if (doc.tags?.length) {
    frontmatter.push(`tags: [${doc.tags.map((t) => `"${t}"`).join(", ")}]`);
  }
  frontmatter.push(`synced_at: "${new Date().toISOString()}"`);
  frontmatter.push("---");
  frontmatter.push("");

  return frontmatter.join("\n") + `# ${doc.title}\n\n${doc.content}`;
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "untitled"
  );
}

export async function pushDocToGitHub(doc: {
  id: string;
  title: string;
  content: string;
  tags?: string[];
}): Promise<SyncLogEntry> {
  const conn = getGitHubConnection();
  if (!conn?.accessToken || !conn.selectedRepo) {
    throw new Error("GitHub not connected or no repo selected");
  }

  const fileName = `docs/${slugify(doc.title)}.md`;
  const markdown = docToMarkdown(doc);
  const content = btoa(unescape(encodeURIComponent(markdown)));

  const entry: SyncLogEntry = {
    id: crypto.randomUUID(),
    action: "push",
    documentId: doc.id,
    fileName,
    timestamp: new Date().toISOString(),
    status: "success",
  };

  try {
    // Check if file exists (to get sha for updates)
    let sha: string | undefined;
    try {
      const existing = await fetch(
        `https://api.github.com/repos/${conn.selectedRepo}/contents/${fileName}?ref=${conn.selectedBranch ?? "main"}`,
        { headers: { Authorization: `Bearer ${conn.accessToken}` } },
      );
      if (existing.ok) {
        const data = await existing.json();
        sha = data.sha;
      }
    } catch {
      // File doesn't exist yet
    }

    const response = await fetch(
      `https://api.github.com/repos/${conn.selectedRepo}/contents/${fileName}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${conn.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `sync: update ${doc.title}`,
          content,
          branch: conn.selectedBranch ?? "main",
          ...(sha ? { sha } : {}),
        }),
      },
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message ?? "Push failed");
    }

    const result = await response.json();
    entry.sha = result.content?.sha;
  } catch (err) {
    entry.status = "error";
    entry.message = err instanceof Error ? err.message : "Push failed";
  }

  addSyncLog(entry);
  return entry;
}

export async function pullDocFromGitHub(filePath: string): Promise<{
  title: string;
  content: string;
  tags: string[];
} | null> {
  const conn = getGitHubConnection();
  if (!conn?.accessToken || !conn.selectedRepo) return null;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${conn.selectedRepo}/contents/${filePath}?ref=${conn.selectedBranch ?? "main"}`,
      { headers: { Authorization: `Bearer ${conn.accessToken}` } },
    );
    if (!response.ok) return null;

    const data = await response.json();
    const decoded = decodeURIComponent(escape(atob(data.content)));

    let title = filePath.split("/").pop()?.replace(/\.md$/, "") ?? "Untitled";
    let content = decoded;
    let tags: string[] = [];

    const fmMatch = decoded.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (fmMatch) {
      const frontmatter = fmMatch[1];
      content = fmMatch[2].trim();

      const titleMatch = frontmatter.match(/title:\s*"(.+?)"/);
      if (titleMatch) title = titleMatch[1];

      const tagsMatch = frontmatter.match(/tags:\s*\[(.+?)\]/);
      if (tagsMatch) {
        tags = tagsMatch[1]
          .split(",")
          .map((t) => t.trim().replace(/^"|"$/g, ""));
      }

      // Strip the leading "# Title" if present
      const headingMatch = content.match(/^# .+\n\n([\s\S]*)$/);
      if (headingMatch) content = headingMatch[1];
    }

    addSyncLog({
      id: crypto.randomUUID(),
      action: "pull",
      fileName: filePath,
      timestamp: new Date().toISOString(),
      status: "success",
    });

    return { title, content, tags };
  } catch {
    addSyncLog({
      id: crypto.randomUUID(),
      action: "pull",
      fileName: filePath,
      timestamp: new Date().toISOString(),
      status: "error",
      message: "Pull failed",
    });
    return null;
  }
}

export async function createPullRequest(
  title: string,
  body: string,
  headBranch: string,
): Promise<string | null> {
  const conn = getGitHubConnection();
  if (!conn?.accessToken || !conn.selectedRepo) return null;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${conn.selectedRepo}/pulls`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${conn.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          body,
          head: headBranch,
          base: conn.selectedBranch ?? "main",
        }),
      },
    );

    if (!response.ok) return null;
    const pr = await response.json();

    addSyncLog({
      id: crypto.randomUUID(),
      action: "pr_created",
      fileName: pr.html_url,
      timestamp: new Date().toISOString(),
      status: "success",
      message: `PR #${pr.number}`,
    });

    return pr.html_url;
  } catch {
    return null;
  }
}

export function resolveIssueLinks(content: string, repo: string): string {
  return content.replace(/#(\d+)/g, (match, num) => {
    return `[${match}](https://github.com/${repo}/issues/${num})`;
  });
}
