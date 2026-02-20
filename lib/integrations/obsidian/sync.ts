const LS_PREFIX = "knobase-app:";
const OBSIDIAN_KEY = `${LS_PREFIX}obsidian-config`;
const SYNC_STATE_KEY = `${LS_PREFIX}obsidian-sync-state`;

export interface ObsidianConfig {
  vaultPath: string;
  syncFrequency: "manual" | "5min" | "15min" | "1hr";
  conflictResolution: "last-write-wins" | "keep-both" | "ask";
  syncEnabled: boolean;
  lastSyncAt?: string;
  fileFilter: string; // glob pattern, e.g. "**/*.md"
}

export interface SyncState {
  files: Record<string, FileSyncState>;
}

interface FileSyncState {
  path: string;
  localHash: string;
  remoteHash: string;
  lastSyncAt: string;
  status: "synced" | "local-changed" | "remote-changed" | "conflict";
}

export function getObsidianConfig(): ObsidianConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(OBSIDIAN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveObsidianConfig(config: ObsidianConfig): void {
  localStorage.setItem(OBSIDIAN_KEY, JSON.stringify(config));
}

export function removeObsidianConfig(): void {
  localStorage.removeItem(OBSIDIAN_KEY);
  localStorage.removeItem(SYNC_STATE_KEY);
}

function getSyncState(): SyncState {
  if (typeof window === "undefined") return { files: {} };
  try {
    const raw = localStorage.getItem(SYNC_STATE_KEY);
    return raw ? JSON.parse(raw) : { files: {} };
  } catch {
    return { files: {} };
  }
}

function saveSyncState(state: SyncState): void {
  localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
}

/**
 * Parse Obsidian-style wiki-links [[Page Name]] and convert to Knobase links.
 */
export function convertWikiLinks(
  content: string,
  docMap: Map<string, string>
): string {
  return content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
    const displayText = alias ?? target;
    const docId = docMap.get(target.toLowerCase());
    if (docId) {
      return `[${displayText}](/documents/${docId})`;
    }
    return `[${displayText}](#)`;
  });
}

/**
 * Convert Knobase internal links back to Obsidian wiki-links.
 */
export function convertToWikiLinks(
  content: string,
  idToTitle: Map<string, string>
): string {
  return content.replace(/\[([^\]]+)\]\(\/documents\/([^)]+)\)/g, (_, text, id) => {
    const title = idToTitle.get(id);
    if (title && title === text) {
      return `[[${title}]]`;
    }
    if (title) {
      return `[[${title}|${text}]]`;
    }
    return `[[${text}]]`;
  });
}

/**
 * Parse YAML frontmatter from a markdown file.
 */
export function parseFrontmatter(content: string): {
  metadata: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { metadata: {}, body: content };

  const raw = match[1];
  const body = match[2];
  const metadata: Record<string, unknown> = {};

  for (const line of raw.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value: unknown = line.slice(colonIdx + 1).trim();

    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
      try { value = JSON.parse(value); } catch { /* keep as string */ }
    }

    metadata[key] = value;
  }

  return { metadata, body };
}

/**
 * Generate YAML frontmatter for a document.
 */
export function generateFrontmatter(doc: {
  title: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}): string {
  const lines = ["---"];
  lines.push(`title: "${doc.title.replace(/"/g, '\\"')}"`);
  if (doc.tags?.length) {
    lines.push(`tags: [${doc.tags.map((t) => `"${t}"`).join(", ")}]`);
  }
  lines.push(`created: ${doc.createdAt}`);
  lines.push(`updated: ${doc.updatedAt}`);
  lines.push(`source: knobase`);
  lines.push("---");
  return lines.join("\n");
}

/**
 * Compute a simple hash of content for change detection.
 */
async function hashContent(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

/**
 * Process a markdown file from Obsidian for import into Knobase.
 */
export function processObsidianFile(
  fileName: string,
  content: string,
  docMap: Map<string, string>
): { title: string; content: string; tags: string[] } {
  const { metadata, body } = parseFrontmatter(content);
  const title = (metadata.title as string) ?? fileName.replace(/\.md$/, "");
  const tags = Array.isArray(metadata.tags) ? metadata.tags.map(String) : [];

  let processed = convertWikiLinks(body, docMap);
  processed = processed.trim();

  // Strip leading title heading if it matches the filename
  const headingMatch = processed.match(/^# (.+)\n/);
  if (headingMatch && headingMatch[1].toLowerCase() === title.toLowerCase()) {
    processed = processed.slice(headingMatch[0].length);
  }

  return { title, content: processed, tags };
}

/**
 * Prepare a Knobase document for export to Obsidian format.
 */
export function prepareForObsidian(
  doc: { title: string; content: string; tags?: string[]; createdAt: string; updatedAt: string },
  idToTitle: Map<string, string>
): string {
  const frontmatter = generateFrontmatter(doc);
  const body = convertToWikiLinks(doc.content, idToTitle);
  return `${frontmatter}\n\n# ${doc.title}\n\n${body}`;
}

/**
 * Track file sync state for conflict detection.
 */
export async function updateFileState(
  path: string,
  localContent: string,
  remoteContent: string
): Promise<FileSyncState> {
  const state = getSyncState();
  const localHash = await hashContent(localContent);
  const remoteHash = await hashContent(remoteContent);
  const existing = state.files[path];

  let status: FileSyncState["status"] = "synced";
  if (existing) {
    const localChanged = localHash !== existing.localHash;
    const remoteChanged = remoteHash !== existing.remoteHash;
    if (localChanged && remoteChanged) status = "conflict";
    else if (localChanged) status = "local-changed";
    else if (remoteChanged) status = "remote-changed";
  }

  const fileState: FileSyncState = {
    path,
    localHash,
    remoteHash,
    lastSyncAt: new Date().toISOString(),
    status,
  };

  state.files[path] = fileState;
  saveSyncState(state);
  return fileState;
}

export function getSyncFrequencyMs(freq: ObsidianConfig["syncFrequency"]): number | null {
  switch (freq) {
    case "5min": return 5 * 60 * 1000;
    case "15min": return 15 * 60 * 1000;
    case "1hr": return 60 * 60 * 1000;
    default: return null;
  }
}
