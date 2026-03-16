import type { Document, DocumentMeta } from "@/lib/documents/types";
import type { Agent } from "@/lib/agents/types";
import type { Mention, MentionInsert } from "@/lib/supabase/types";
import { createMention } from "@/lib/supabase/mentions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type BlockOperation,
  type BlockMutationResult,
  applyOperations,
} from "@/lib/mcp/block-operations";

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, { type: string; description?: string; items?: Record<string, unknown> }>;
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
      "Apply block-level operations to an existing document. Operations are applied sequentially and atomically — if any operation fails, the document is left unchanged. Use read_document first to discover block IDs.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: {
          type: "string",
          description: "The ID of the document to modify",
        },
        operations: {
          type: "array",
          description:
            "Ordered list of block operations to apply. Each operation has: type (replace_block | insert_after_block | insert_before_block | delete_block | append | prepend), block_id (required for block-targeted ops), content (HTML string for the new/replacement content).",
        },
      },
      required: ["document_id", "operations"],
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
    name: "create_document",
    description:
      "Create a new document in the Knobase workspace. Optionally set initial content and nest it under a parent document.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title for the new document" },
        content: {
          type: "string",
          description: "Initial HTML content for the document (optional)",
        },
        parent_id: {
          type: "string",
          description: "ID of the parent document to nest this document under (optional)",
        },
      },
      required: ["title"],
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
  {
    name: "get_agent_info",
    description:
      "Get the current agent's own profile information (name, avatar, status, capabilities). Uses the API key to identify the calling agent.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "update_agent_profile",
    description:
      "Update the current agent's own profile. Allows changing name, description (personality), and avatar_url. Uses the API key to identify the calling agent.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "New display name for the agent" },
        description: {
          type: "string",
          description: "New description / personality text for the agent",
        },
        avatar_url: {
          type: "string",
          description: "New avatar URL or emoji for the agent",
        },
      },
    },
  },
  {
    name: "list_workspace_agents",
    description:
      "List all agents in the workspace with their id, name, description, and avatar. Uses the API key to scope to the correct workspace.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_mention",
    description:
      "Create a @mention in a document, targeting a specific user or agent. Automatically triggers a notification for the mentioned user via the database trigger.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: {
          type: "string",
          description: "The ID of the document containing the mention",
        },
        target_user_id: {
          type: "string",
          description: "The ID of the user or agent being mentioned",
        },
        mention_text: {
          type: "string",
          description: "The display text for the mention (e.g. '@Alice')",
        },
        context_text: {
          type: "string",
          description: "Surrounding text providing context for the mention (optional)",
        },
        block_id: {
          type: "string",
          description: "The block ID within the document where the mention occurs (optional)",
        },
      },
      required: ["document_id", "target_user_id", "mention_text"],
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

export function formatCreateResult(doc: Document): MCPToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            status: "created",
            id: doc.id,
            title: doc.title,
            ...(doc.parentId ? { parent_id: doc.parentId } : {}),
            createdAt: doc.createdAt,
          },
          null,
          2
        ),
      },
    ],
  };
}

/**
 * Apply block-level operations to document content and return an MCP-formatted result.
 */
export function applyBlockOperations(
  content: string,
  operations: BlockOperation[],
): BlockMutationResult {
  return applyOperations(content, operations);
}

export function formatBlockWriteResult(
  documentId: string,
  result: BlockMutationResult,
  operationCount: number,
): MCPToolResult {
  if (!result.success) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              status: "error",
              document_id: documentId,
              error: result.error,
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            status: "updated",
            document_id: documentId,
            operations_applied: operationCount,
          },
          null,
          2,
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

export function formatAgentInfo(agent: Agent | null): MCPToolResult {
  if (!agent) {
    return {
      content: [{ type: "text", text: "Agent not found for the provided API key" }],
      isError: true,
    };
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            id: agent.id,
            name: agent.name,
            avatar: agent.avatar,
            color: agent.color,
            status: agent.status,
            personality: agent.personality,
            capabilities: agent.capabilities,
            createdAt: agent.createdAt,
            updatedAt: agent.updatedAt,
          },
          null,
          2
        ),
      },
    ],
  };
}

export function formatAgentUpdateResult(agent: Agent | null): MCPToolResult {
  if (!agent) {
    return {
      content: [{ type: "text", text: "Failed to update agent profile" }],
      isError: true,
    };
  }
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            status: "updated",
            id: agent.id,
            name: agent.name,
            avatar: agent.avatar,
            personality: agent.personality,
            updatedAt: agent.updatedAt,
          },
          null,
          2
        ),
      },
    ],
  };
}

export function formatWorkspaceAgentList(agents: Agent[]): MCPToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          agents.map((a) => ({
            id: a.id,
            name: a.name,
            description: a.personality,
            avatar: a.avatar,
          })),
          null,
          2
        ),
      },
    ],
  };
}

export interface CreateMentionInput {
  document_id: string;
  target_user_id: string;
  mention_text: string;
  context_text?: string;
  block_id?: string;
}

export async function handleCreateMention(
  input: CreateMentionInput,
  ctx: { agentId?: string; userId?: string; schoolId?: string | null },
): Promise<MCPToolResult> {
  const { document_id, target_user_id, mention_text, context_text, block_id } = input;

  if (!document_id || !target_user_id || !mention_text) {
    return {
      content: [{ type: "text", text: "Missing required fields: document_id, target_user_id, and mention_text are required" }],
      isError: true,
    };
  }

  const sourceId = ctx.agentId ?? ctx.userId;
  if (!sourceId) {
    return {
      content: [{ type: "text", text: "No authenticated context — cannot determine mention source" }],
      isError: true,
    };
  }

  if (!ctx.schoolId) {
    return {
      content: [{ type: "text", text: "No workspace context — school_id is required to create a mention" }],
      isError: true,
    };
  }

  const sourceType: MentionInsert["source_type"] = ctx.agentId ? "agent" : "human";

  // Resolve target_type from users table: agents use type='agent', humans use type='human' or null
  let targetType: MentionInsert["target_type"] = "human";
  try {
    const adminClient = createAdminClient();
    const { data: targetUser } = await adminClient
      .from("users")
      .select("type")
      .eq("id", target_user_id)
      .single();
    if (targetUser?.type === "agent") {
      targetType = "agent";
    }
  } catch {
    // Default to human if lookup fails (e.g. user not found)
  }

  const insertPayload: MentionInsert = {
    document_id,
    school_id: ctx.schoolId,
    source_type: sourceType,
    source_id: sourceId,
    target_type: targetType,
    target_id: target_user_id,
    target_name: mention_text.replace(/^@/, ""),
    mention_text,
    ...(context_text ? { context_text } : {}),
    ...(block_id ? { block_id } : {}),
    is_agent_generated: !!ctx.agentId,
  };

  try {
    const mention = await createMention(insertPayload);
    return formatCreateMentionResult(mention);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Failed to create mention: ${message}` }],
      isError: true,
    };
  }
}

export function formatCreateMentionResult(mention: Mention): MCPToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            status: "created",
            id: mention.id,
            document_id: mention.document_id,
            target_id: mention.target_id,
            target_name: mention.target_name,
            mention_text: mention.mention_text,
            resolution_status: mention.resolution_status,
            created_at: mention.created_at,
          },
          null,
          2,
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
