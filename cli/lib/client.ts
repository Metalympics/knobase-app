import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const CONFIG_DIR = join(homedir(), ".knobase");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export interface CLIConfig {
  apiUrl: string;
  apiKey: string;
  defaultWorkspace?: string;
}

export function getConfig(): CLIConfig | null {
  if (!existsSync(CONFIG_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return null;
  }
}

export function saveConfig(config: CLIConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function requireConfig(): CLIConfig {
  const config = getConfig();
  if (!config) {
    console.error("Not authenticated. Run: knobase login");
    process.exit(1);
  }
  return config;
}

async function request(
  config: CLIConfig,
  method: string,
  path: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const url = `${config.apiUrl}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": "knobase-cli/1.0",
  };

  const res = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function listDocuments(
  config: CLIConfig,
  params?: { limit?: number; offset?: number; search?: string }
): Promise<unknown> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  if (params?.search) query.set("search", params.search);

  const qs = query.toString();
  const { ok, data } = await request(config, "GET", `/api/v1/documents${qs ? `?${qs}` : ""}`);
  if (!ok) throw new Error(`API error: ${JSON.stringify(data)}`);
  return data;
}

export async function getDocument(config: CLIConfig, id: string): Promise<unknown> {
  const { ok, data } = await request(config, "GET", `/api/v1/documents/${id}`);
  if (!ok) throw new Error(`API error: ${JSON.stringify(data)}`);
  return data;
}

export async function createDocument(
  config: CLIConfig,
  doc: { title: string; content: string; tags?: string[] }
): Promise<unknown> {
  const { ok, data } = await request(config, "POST", "/api/v1/documents", doc);
  if (!ok) throw new Error(`API error: ${JSON.stringify(data)}`);
  return data;
}

export async function updateDocument(
  config: CLIConfig,
  id: string,
  patch: { title?: string; content?: string; tags?: string[] }
): Promise<unknown> {
  const { ok, data } = await request(config, "PATCH", `/api/v1/documents/${id}`, patch);
  if (!ok) throw new Error(`API error: ${JSON.stringify(data)}`);
  return data;
}

export async function deleteDocument(config: CLIConfig, id: string): Promise<unknown> {
  const { ok, data } = await request(config, "DELETE", `/api/v1/documents/${id}`);
  if (!ok) throw new Error(`API error: ${JSON.stringify(data)}`);
  return data;
}

export async function searchDocuments(
  config: CLIConfig,
  query: string,
  filters?: { tags?: string[] }
): Promise<unknown> {
  const { ok, data } = await request(config, "POST", "/api/v1/search", { query, filters });
  if (!ok) throw new Error(`API error: ${JSON.stringify(data)}`);
  return data;
}
