export interface KnobaseConfig {
  apiUrl: string;
  apiKey: string;
  timeout?: number;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  wordCount?: number;
}

export interface DocumentMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  contentLength: number;
  tags?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  score: number;
  tags?: string[];
  updatedAt: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  documentIds: string[];
  icon: string;
  color: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  status: string;
  capabilities: string[];
}

export interface AgentResponse {
  agentId: string;
  agentName: string;
  action: string;
  content: string;
  reasoning?: string;
  model?: string;
  timestamp: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

class KnobaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "KnobaseError";
  }
}

export class KnobaseClient {
  private apiUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: KnobaseConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30_000;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "@knobase/sdk-js/1.0",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(this.timeout),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = data as { error?: string; code?: string; details?: unknown };
      throw new KnobaseError(
        err.error ?? `Request failed with status ${res.status}`,
        err.code ?? "UNKNOWN",
        res.status,
        err.details
      );
    }

    return data as T;
  }

  // --- Documents ---

  async listDocs(params?: {
    limit?: number;
    offset?: number;
    search?: string;
    tags?: string[];
    collection?: string;
  }): Promise<PaginatedResponse<DocumentMeta>> {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    if (params?.search) query.set("search", params.search);
    if (params?.tags?.length) query.set("tags", params.tags.join(","));
    if (params?.collection) query.set("collection", params.collection);
    const qs = query.toString();
    return this.request("GET", `/api/v1/documents${qs ? `?${qs}` : ""}`);
  }

  async getDoc(id: string): Promise<{ data: Document }> {
    return this.request("GET", `/api/v1/documents/${id}`);
  }

  async createDoc(doc: {
    title: string;
    content?: string;
    tags?: string[];
    parentId?: string;
  }): Promise<{ data: Document }> {
    return this.request("POST", "/api/v1/documents", doc);
  }

  async updateDoc(
    id: string,
    patch: { title?: string; content?: string; tags?: string[] }
  ): Promise<{ data: Document }> {
    return this.request("PATCH", `/api/v1/documents/${id}`, patch);
  }

  async deleteDoc(id: string): Promise<{ message: string }> {
    return this.request("DELETE", `/api/v1/documents/${id}`);
  }

  // --- Search ---

  async search(
    query: string,
    options?: {
      filters?: { tags?: string[]; author?: string; dateFrom?: string; dateTo?: string };
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<SearchResult>> {
    return this.request("POST", "/api/v1/search", {
      query,
      filters: options?.filters,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  // --- Collections ---

  async listCollections(): Promise<{ data: Collection[] }> {
    return this.request("GET", "/api/v1/collections");
  }

  async createCollection(col: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    documentIds?: string[];
  }): Promise<{ data: Collection }> {
    return this.request("POST", "/api/v1/collections", col);
  }

  // --- Agents ---

  async listAgents(): Promise<{ data: Agent[] }> {
    return this.request("GET", "/api/v1/agents");
  }

  async invokeAgent(params: {
    agentId?: string;
    action: "read" | "write" | "chat" | "summarize";
    content?: string;
    context?: string;
    documentId?: string;
  }): Promise<{ data: AgentResponse }> {
    return this.request("POST", "/api/v1/agents", params);
  }

  // --- Webhooks ---

  async listWebhooks(): Promise<{ data: Webhook[] }> {
    return this.request("GET", "/api/v1/webhooks");
  }

  async createWebhook(wh: {
    url: string;
    events: string[];
    secret?: string;
    active?: boolean;
  }): Promise<{ data: Webhook }> {
    return this.request("POST", "/api/v1/webhooks", wh);
  }
}

export default KnobaseClient;
