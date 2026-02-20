import type { Document, DocumentMeta } from "@/lib/documents/types";
import type { Agent } from "@/lib/agents/types";

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
}

export interface MCPToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export const TOOL_DEFINITIONS: MCPToolDefinition[] = [
  {
    name: "list_documents",
    description:
      "List all documents in the Knobase workspace. Returns document metadata including id, title, and timestamps.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "read_document",
    description:
      "Read the full content of a specific document by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The document ID to read" },
      },
      required: ["id"],
    },
  },
  {
    name: "write_document",
    description:
      "Create a new document or update an existing one. If id is provided, updates that document. Otherwise creates a new one.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Document ID to update (omit to create new)",
        },
        title: { type: "string", description: "Document title" },
        content: {
          type: "string",
          description: "Document content in markdown",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "search_documents",
    description:
      "Search documents by title or content. Returns matching documents with relevance.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query string" },
      },
      required: ["query"],
    },
  },
  {
    name: "delete_document",
    description: "Delete a document by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The document ID to delete" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_agents",
    description:
      "List all AI agents configured in the Knobase workspace.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export function formatDocumentList(docs: DocumentMeta[]): MCPToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          docs.map((d) => ({
            id: d.id,
            title: d.title,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          })),
          null,
          2
        ),
      },
    ],
  };
}

export function formatDocument(doc: Document | null): MCPToolResult {
  if (!doc) {
    return {
      content: [{ type: "text", text: "Document not found" }],
      isError: true,
    };
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            id: doc.id,
            title: doc.title,
            content: doc.content,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          },
          null,
          2
        ),
      },
    ],
  };
}

export function formatWriteResult(doc: Document | null, created: boolean): MCPToolResult {
  if (!doc) {
    return {
      content: [{ type: "text", text: "Failed to write document" }],
      isError: true,
    };
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            status: created ? "created" : "updated",
            id: doc.id,
            title: doc.title,
            updatedAt: doc.updatedAt,
          },
          null,
          2
        ),
      },
    ],
  };
}

export function formatSearchResults(
  docs: Document[],
  query: string
): MCPToolResult {
  const q = query.toLowerCase();
  const scored = docs
    .map((doc) => {
      let score = 0;
      const titleLower = doc.title.toLowerCase();
      const contentLower = doc.content.toLowerCase();
      if (titleLower.includes(q)) score += 10;
      if (contentLower.includes(q)) score += 5;
      q.split(/\s+/).forEach((word) => {
        if (titleLower.includes(word)) score += 3;
        if (contentLower.includes(word)) score += 1;
      });
      return { doc, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          scored.map((r) => ({
            id: r.doc.id,
            title: r.doc.title,
            score: r.score,
            snippet:
              r.doc.content.substring(0, 200) +
              (r.doc.content.length > 200 ? "..." : ""),
          })),
          null,
          2
        ),
      },
    ],
  };
}

export function formatDeleteResult(success: boolean): MCPToolResult {
  return {
    content: [
      {
        type: "text",
        text: success
          ? "Document deleted successfully"
          : "Document not found",
      },
    ],
    isError: !success,
  };
}

export function formatAgentList(agents: Agent[]): MCPToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          agents.map((a) => ({
            id: a.id,
            name: a.name,
            avatar: a.avatar,
            status: a.status,
            capabilities: a.capabilities,
            personality: a.personality,
          })),
          null,
          2
        ),
      },
    ],
  };
}

export function buildResourceList(docs: DocumentMeta[]): MCPResource[] {
  const resources: MCPResource[] = [
    {
      uri: "workspace://info",
      name: "Workspace Info",
      description: "Current workspace metadata and document count",
      mimeType: "application/json",
    },
  ];
  for (const doc of docs) {
    resources.push({
      uri: `document://${doc.id}`,
      name: doc.title || "Untitled",
      description: `Document updated ${doc.updatedAt}`,
      mimeType: "text/markdown",
    });
  }
  return resources;
}
